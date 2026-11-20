const API = (window.TWOCHAT_API || '').replace(/\/$/, '');
const FALLBACK_ICE_SERVERS = [
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

let room = '';
let name = '';
let ws = null;
let pc = null;
let localStream = null;
let pendingOffer = null;
let pendingCandidates = [];
let activeCallId = null;
let callKind = '';
let callTimer = null;
let reconnectTimer = null;
let heartbeatTimer = null;
let reconnectAttempt = 0;
let queuedSignals = [];
let disconnectedTimer = null;
let peerStatus = 'Waiting for the other person';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

function setStatus(value) {
  $('status').textContent = value;
}

function formatLastSeen(timestamp) {
  const time = Number(timestamp);
  if (!Number.isFinite(time) || time <= 0) return 'Last seen unavailable';
  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (seconds < 60) return 'Last seen just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return 'Last seen ' + minutes + 'm ago';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return 'Last seen ' + hours + 'h ago';
  const days = Math.floor(hours / 24);
  if (days < 30) return 'Last seen ' + days + 'd ago';
  return 'Last seen ' + new Date(time).toLocaleString();
}

function updatePeerStatus(data) {
  peerStatus = data.online
    ? 'Online'
    : data.lastSeen
      ? formatLastSeen(data.lastSeen)
      : 'Waiting for the other person';
  if (!pc && !pendingOffer) setStatus(peerStatus);
}

function addMessage(message) {
  if (document.querySelector('.msg[data-message-id="' + CSS.escape(String(message.id)) + '"]')) return;
  const element = document.createElement('div');
  element.className = 'msg ' + (message.sender === name ? 'mine' : '');
  element.dataset.messageId = String(message.id);
  element.innerHTML =
    esc(message.text || '') +
    '<small>' + esc(message.sender) + ' · ' +
    new Date(message.created_at || Date.now()).toLocaleTimeString([], {
      hour: '2-digit', minute: '2-digit'
    }) + '</small>';
  $('messages').appendChild(element);
  $('messages').scrollTop = $('messages').scrollHeight;
}

async function loadMessages() {
  const response = await fetch(API + '/api/messages?room=' + encodeURIComponent(room));
  if (!response.ok) throw new Error('Messages unavailable');
  const messages = await response.json();
  $('messages').innerHTML = '';
  messages.forEach(addMessage);
}

async function sendMessage(text) {
  const response = await fetch(API + '/api/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ room, name, text })
  });
  if (!response.ok) throw new Error('Send failed');
}

async function loadIceServers() {
  try {
    const response = await fetch(API + '/api/ice-servers', { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.iceServers) && data.iceServers.length) return data.iceServers;
    }
  } catch (error) {
    console.warn('TURN configuration unavailable; using STUN fallback', error);
  }
  return FALLBACK_ICE_SERVERS;
}

function sendSignal(message) {
  const payload = JSON.stringify(message);
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(payload);
      return;
    } catch (error) {
      console.warn('Signaling send failed; queueing message', error);
    }
  }
  if (queuedSignals.length < 128) queuedSignals.push(payload);
}

function flushQueuedSignals() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  while (queuedSignals.length) {
    const payload = queuedSignals[0];
    try {
      ws.send(payload);
      queuedSignals.shift();
    } catch (error) {
      console.warn('Could not flush signaling queue', error);
      break;
    }
  }
}

function socketUrl() {
  const url = new URL(API);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/ws';
  url.search = '';
  url.searchParams.set('room', room);
  url.searchParams.set('name', name);
  return url.toString();
}

function connect() {
  if (!room || !name) return;
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  clearTimeout(reconnectTimer);

  let socket;
  try {
    socket = new WebSocket(socketUrl());
  } catch (error) {
    setStatus('Cannot connect to chat server');
    scheduleReconnect();
    return;
  }
  ws = socket;

  socket.onopen = () => {
    if (ws !== socket) return;
    reconnectAttempt = 0;
    flushQueuedSignals();
    setStatus(pc ? 'Call active · signaling connected' : 'Connected · checking presence');
    clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(() => {
      if (ws === socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'heartbeat' }));
      }
    }, 15000);
  };

  socket.onmessage = async event => {
    if (ws !== socket) return;
    let message;
    try {
      message = JSON.parse(event.data);
    } catch (error) {
      console.warn('Invalid signaling message', error);
      return;
    }

    if (message.type === 'message') {
      addMessage(message);
      return;
    }
    if (message.type === 'peer') {
      updatePeerStatus(message);
      return;
    }
    await handleSignal(message);
  };

  socket.onerror = () => {
    if (ws === socket && !pc) setStatus('Connection problem · reconnecting');
  };

  socket.onclose = () => {
    if (ws !== socket) return;
    clearInterval(heartbeatTimer);
    setStatus(pc ? 'Signaling disconnected · reconnecting' : 'Disconnected · reconnecting');
    scheduleReconnect();
  };
}

function scheduleReconnect() {
  clearTimeout(reconnectTimer);
  const delay = Math.min(15000, 1000 * Math.pow(2, reconnectAttempt++));
  reconnectTimer = setTimeout(() => {
    ws = null;
    connect();
  }, delay);
}

function newCallId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}

function showCall(video) {
  $('call').classList.remove('hidden');
  $('incoming').classList.add('hidden');
  $('callTitle').textContent = video ? 'Video call' : 'Voice call';
  $('localVideo').classList.toggle('hidden', !video);
  $('remoteVideo').classList.toggle('hidden', !video);
}

function clearCallTimer() {
  clearTimeout(callTimer);
  callTimer = null;
  clearTimeout(disconnectedTimer);
  disconnectedTimer = null;
}

function startCallTimer() {
  clearCallTimer();
  callTimer = setTimeout(() => {
    if (pc && pc.connectionState !== 'connected') {
      closeCall(true);
      setStatus('Call timed out · check the network or TURN setup');
    }
  }, 45000);
}

async function createPeer(video) {
  const iceServers = await loadIceServers();
  const connection = new RTCPeerConnection({
    iceServers,
    iceCandidatePoolSize: 4,
    bundlePolicy: 'max-bundle'
  });
  pc = connection;
  let hasConnected = false;
  const clearDisconnectGrace = () => {
    clearTimeout(disconnectedTimer);
    disconnectedTimer = null;
  };
  const armDisconnectGrace = () => {
    // Do not terminate an initial ICE negotiation on a transient state.
    if (!hasConnected || disconnectedTimer) return;
    disconnectedTimer = setTimeout(() => {
      if (pc === connection &&
          connection.connectionState === 'disconnected' &&
          connection.iceConnectionState === 'disconnected') {
        closeCall(false);
        setStatus('Call disconnected');
      }
    }, 20000);
  };

  connection.onicecandidate = event => {
    if (event.candidate && pc === connection) {
      sendSignal({
        type: 'candidate',
        callId: activeCallId,
        candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate
      });
    }
  };
  connection.onicecandidateerror = event => {
    console.warn('ICE candidate server error', {
      url: event.url,
      code: event.errorCode,
      text: event.errorText
    });
  };
  connection.ontrack = event => {
    if (pc !== connection) return;
    const stream = event.streams && event.streams[0]
      ? event.streams[0]
      : new MediaStream([event.track]);
    if (video) {
      $('remoteVideo').srcObject = stream;
      $('remoteVideo').play().catch(() => {});
    } else {
      $('remoteAudio').srcObject = stream;
      $('remoteAudio').play().catch(() => {});
    }
  };
  connection.onconnectionstatechange = () => {
    if (pc !== connection) return;
    const state = connection.connectionState;
    if (state === 'connected') {
      hasConnected = true;
      clearCallTimer();
      setStatus(video ? 'Video call connected' : 'Voice call connected');
    } else if (state === 'disconnected') {
      setStatus(hasConnected
        ? 'Call interrupted · attempting to reconnect'
        : 'Call negotiating · checking connection');
      armDisconnectGrace();
    } else if (state === 'failed') {
      closeCall(false);
      setStatus('Call failed · no usable network path');
    }
  };
  connection.oniceconnectionstatechange = () => {
    if (pc !== connection) return;
    const state = connection.iceConnectionState;
    if (state === 'connected' || state === 'completed') {
      hasConnected = true;
      clearDisconnectGrace();
      clearCallTimer();
      setStatus(video ? 'Video call connected' : 'Voice call connected');
    } else if (state === 'checking') {
      clearDisconnectGrace();
      if (!hasConnected) setStatus('Call negotiating · checking connection');
    } else if (state === 'disconnected') {
      setStatus(hasConnected
        ? 'Call interrupted · attempting to reconnect'
        : 'Call negotiating · checking connection');
      armDisconnectGrace();
    } else if (state === 'failed') {
      closeCall(false);
      setStatus('ICE failed · no usable connection path');
    }
  };
  return connection;
}
async function flushPendingCandidates() {
  if (!pc || !pc.remoteDescription) return;
  const queued = pendingCandidates;
  pendingCandidates = [];
  for (const item of queued) {
    if (item.callId && activeCallId && item.callId !== activeCallId) continue;
    try {
      await pc.addIceCandidate(item.candidate);
    } catch (error) {
      console.warn('Could not add queued ICE candidate', error);
    }
  }
}

async function startCall(video) {
  if (pc || pendingOffer) return;
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    alert('Chat server is reconnecting. Please try the call again when it is connected.');
    return;
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('Calling requires a secure HTTPS page and browser media support.');
    return;
  }

  callKind = video ? 'video' : 'voice';
  activeCallId = newCallId();
  pendingCandidates = [];
  setStatus(video ? 'Starting video call…' : 'Starting voice call…');

  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: !!video
    });
    showCall(!!video);
    if (video) {
      $('localVideo').srcObject = localStream;
      $('localVideo').play().catch(() => {});
    }

    const connection = await createPeer(!!video);
    localStream.getTracks().forEach(track => connection.addTrack(track, localStream));
    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    sendSignal({
      type: 'offer',
      callId: activeCallId,
      sdp: connection.localDescription.sdp,
      video: !!video
    });
    startCallTimer();
    setStatus(video ? 'Calling · video' : 'Calling · voice');
  } catch (error) {
    console.error('Could not start call', error);
    closeCall(false);
    setStatus('Could not start call');
    alert(error.name === 'NotAllowedError'
      ? 'Camera or microphone permission was denied.'
      : 'Unable to access the camera or microphone: ' + (error.message || error.name));
  }
}

function showIncoming(message) {
  pendingOffer = message;
  activeCallId = message.callId || 'legacy';
  pendingCandidates = pendingCandidates.filter(item => !item.callId || item.callId === activeCallId);
  $('call').classList.remove('hidden');
  $('incoming').classList.remove('hidden');
  $('callTitle').textContent = 'Incoming ' + (message.video ? 'video' : 'voice') + ' call';
  $('incomingText').textContent = (message.from || 'Someone') + ' is calling';
  setStatus('Incoming ' + (message.video ? 'video' : 'voice') + ' call');
}

async function acceptCall() {
  const offer = pendingOffer;
  if (!offer) return;
  pendingOffer = null;
  callKind = offer.video ? 'video' : 'voice';
  activeCallId = offer.callId || activeCallId || 'legacy';
  setStatus('Connecting call…');

  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: !!offer.video
    });
    showCall(!!offer.video);
    if (offer.video) {
      $('localVideo').srcObject = localStream;
      $('localVideo').play().catch(() => {});
    }

    const connection = await createPeer(!!offer.video);
    localStream.getTracks().forEach(track => connection.addTrack(track, localStream));
    const remoteDescription = offer.offer && typeof offer.offer === 'object'
      ? offer.offer
      : { type: 'offer', sdp: offer.sdp };
    await connection.setRemoteDescription(remoteDescription);
    await flushPendingCandidates();

    const answer = await connection.createAnswer();
    await connection.setLocalDescription(answer);
    sendSignal({
      type: 'answer',
      callId: activeCallId,
      sdp: connection.localDescription.sdp
    });
    startCallTimer();
  } catch (error) {
    console.error('Could not accept call', error);
    sendSignal({ type: 'reject', callId: activeCallId });
    closeCall(false);
    setStatus('Could not accept call');
    alert(error.name === 'NotAllowedError'
      ? 'Camera or microphone permission was denied.'
      : 'Unable to accept the call: ' + (error.message || error.name));
  }
}

function closeCall(send = true) {
  const callId = activeCallId;
  clearCallTimer();
  if (send && callId) sendSignal({ type: 'hangup', callId });

  if (pc) {
    const connection = pc;
    pc = null;
    connection.onicecandidate = null;
    connection.ontrack = null;
    connection.onconnectionstatechange = null;
    connection.oniceconnectionstatechange = null;
    try { connection.close(); } catch (error) { console.warn('Peer close failed', error); }
  }

  if (localStream) {
    localStream.getTracks().forEach(track => {
      try { track.stop(); } catch (error) { console.warn('Track stop failed', error); }
    });
    localStream = null;
  }

  pendingCandidates = [];
  pendingOffer = null;
  activeCallId = null;
  callKind = '';
  $('remoteVideo').srcObject = null;
  $('remoteAudio').srcObject = null;
  $('localVideo').srcObject = null;
  $('call').classList.add('hidden');
  $('incoming').classList.add('hidden');
  if (ws && ws.readyState === WebSocket.OPEN) setStatus(peerStatus);
}

async function handleSignal(message) {
  try {
    if (message.type === 'offer') {
      if (pc || pendingOffer) {
        sendSignal({ type: 'busy', callId: message.callId });
        return;
      }
      showIncoming(message);
      return;
    }

    if (message.type === 'candidate') {
      if (message.callId && activeCallId && message.callId !== activeCallId) return;
      if (!pc || !pc.remoteDescription) {
        if (pendingCandidates.length < 256) {
          pendingCandidates.push({ callId: message.callId || activeCallId, candidate: message.candidate });
        }
      } else {
        try {
          await pc.addIceCandidate(message.candidate);
        } catch (error) {
          console.warn('Could not add ICE candidate', error);
        }
      }
      return;
    }

    if (message.callId && activeCallId && message.callId !== activeCallId) return;

    if (message.type === 'answer' && pc) {
      const answer = message.answer && typeof message.answer === 'object'
        ? message.answer
        : { type: 'answer', sdp: message.sdp };
      await pc.setRemoteDescription(answer);
      await flushPendingCandidates();
    } else if (message.type === 'hangup') {
      closeCall(false);
      setStatus('Call ended');
    } else if (message.type === 'reject') {
      closeCall(false);
      setStatus('Call declined');
    } else if (message.type === 'busy') {
      closeCall(false);
      setStatus('The other person is busy');
    }
  } catch (error) {
    console.error('Signaling error', error);
    closeCall(false);
    setStatus('Call signaling failed');
  }
}

function declineCall() {
  if (pendingOffer) sendSignal({ type: 'reject', callId: activeCallId });
  closeCall(false);
  setStatus(peerStatus);
}

$('joinBtn').onclick = async () => {
  name = $('name').value.trim();
  room = $('room').value.trim();
  if (!name || !room) return alert('Enter your name and a private room code.');
  if (!API || API.includes('REPLACE-WITH')) return alert('Set the Cloudflare Worker URL in chat/config.js first.');
  $('joinBtn').disabled = true;
  try {
    await loadMessages();
    $('join').classList.add('hidden');
    $('chat').classList.remove('hidden');
    $('roomTitle').textContent = 'Room: ' + room;
    setStatus('Connecting…');
    connect();
  } catch (error) {
    alert(error.message || 'Could not join the room');
    $('joinBtn').disabled = false;
  }
};

$('composer').onsubmit = async event => {
  event.preventDefault();
  const text = $('message').value.trim();
  if (!text) return;
  $('message').disabled = true;
  try {
    await sendMessage(text);
    $('message').value = '';
  } catch (error) {
    alert(error.message || 'Message failed');
  } finally {
    $('message').disabled = false;
  }
};

$('voiceBtn').onclick = () => startCall(false);
$('videoBtn').onclick = () => startCall(true);
$('hangup').onclick = () => closeCall(true);
$('accept').onclick = acceptCall;
$('decline').onclick = declineCall;
$('mute').onclick = () => {
  const track = localStream && localStream.getAudioTracks()[0];
  if (!track) return;
  track.enabled = !track.enabled;
  $('mute').textContent = track.enabled ? 'Mute' : 'Unmute';
};
$('camera').onclick = () => {
  const track = localStream && localStream.getVideoTracks()[0];
  if (!track) return;
  track.enabled = !track.enabled;
  $('camera').textContent = track.enabled ? 'Camera' : 'Camera off';
};
window.addEventListener('beforeunload', () => {
  clearInterval(heartbeatTimer);
  clearTimeout(reconnectTimer);
  clearCallTimer();
});

