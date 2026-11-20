// ===== PART 1a =====
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
};
const MAX_ATTACHMENT_BYTES = 1400000;

const HTML = `
<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CHAT // Terminal</title>
<style>
*{box-sizing:border-box;}
html,body{margin:0;height:100%;background:#050805;color:#c8ffc8;font-family:"Courier New",monospace;}
body{display:flex;justify-content:center;}
main{width:min(900px,100%);height:100%;display:flex;flex-direction:column;background:#020502;border:1px solid #183818;box-shadow:0 0 30px #001500;}
.top{padding:13px 16px;border-bottom:1px solid #174117;display:flex;justify-content:space-between;align-items:center;background:#071007;}
.brand{font-weight:bold;color:#65ff65;}
.brand:before{content:"#§$";color:#3d9f3d;}
.status{font-size:12px;color:#75d875;}
.setup{margin:auto;width:min(620px,90%);display:grid;gap:12px;padding:25px;border:1px solid #205820;background:#050b05;box-shadow:0 0 20px #001800;}
.setup h2{margin:0;color:#7cff7c;font-size:18px;}
.setup p,.hint{color:#6f9f6f;font-size:13px;}
.setup p{margin:0;}
.setup input,.composer input{background:#020502;border:1px solid #276027;color:#bfffbf;outline:none;font:inherit;}
.setup input{padding:12px;}
.setup input:focus,.composer input:focus{border-color:#65ff65;}
.setup button{padding:12px;background:#123d12;border:1px solid #4eaf4e;color:#9fff9f;font:inherit;font-weight:bold;cursor:pointer;}
.chat{display:none;flex:1;min-height:0;flex-direction:column;}
.messages{flex:1;overflow:auto;padding:16px;}
.messages:before{content:"--- secure room session ---";display:block;color:#397039;margin-bottom:12px;}
.msg{display:table;margin:7px 0;max-width:75%;width:auto;overflow-wrap:anywhere;line-height:1.45;position:relative;padding:7px 8px 20px;white-space:pre-wrap;border:1px solid #397a39;border-radius:8px;background:transparent;user-select:none;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;}
.msg-time{position:absolute;right:7px;bottom:4px;font-size:10px;color:#5d8b5d;white-space:nowrap}
.attachment .msg-time{color:#6f9f6f}
.msg:before{content:"> ";color:#397039}
.reply-preview{color:#6fa8dc;border-left:3px solid #4a90e2;padding:4px 7px;margin:2px 0 5px;opacity:.85;text-align:left;overflow:hidden;}
.message-actions{display:none;gap:6px;margin-top:6px;padding-top:5px;border-top:1px solid #174117;flex-wrap:wrap;}
.msg.show-actions .message-actions{display:flex;}
.message-actions button{padding:4px 8px;background:#0c2d0c;border:1px solid #397a39;color:#9fff9f;font:inherit;font-size:11px;font-weight:bold;cursor:pointer;}
.message-actions .reply-message{border-color:#7a9f55;color:#c8ff9f;}
.message-actions .edit-message{border-color:#5b8db8;color:#a9d5ff;}
.message-actions .delete-message{border-color:#a95555;color:#ff9f9f;}
@media (hover:hover) and (pointer:fine){
  .msg:hover .message-actions{display:flex;}
  .message-actions{align-items:center;}
}
.edited-label{color:#6f9f6f;font-size:10px;}
.reply-who{display:block;font-weight:700;font-size:.85em;}
.reply-text{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:.82em;}
.reply-highlight{outline:1px solid currentColor;transition:outline .2s ease;}
.msg{transition:transform .15s ease;}
.mine{margin-left:auto;text-align:left;color:#8dff8d;border-color:#65ff65;}
.mine:before{content:"$";color:#559955;}
.who{display:inline;color:#559955;font-size:12px;}
.who:after{content:": ";color:#397039;}
.attachment{display:inline-block;position:relative;margin-top:4px;padding:7px 45px 24px 9px;border:1px solid #397a39;color:#9fff9f;text-decoration:none;background:#071007;}
.attachment:hover{border-color:#65ff65;}
.attachment small{display:block;color:#6f9f6f;margin-top:3px;}
.reply-bar{display:flex;align-items:center;gap:8px;padding:7px 10px;border-top:1px solid #174117;border-left:3px solid #4a90e2;background:#071007;color:#6fa8dc;font-size:12px;}
.reply-bar.hidden{display:none!important;}
.reply-bar>div{flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;}
.reply-bar button{border:0;background:transparent;color:#6fa8dc;font-size:22px;cursor:pointer;padding:0 5px;}
.composer{display:flex;gap:8px;padding:10px;border-top:1px solid #174117;}
.composer input,.composer textarea{flex:1;padding:11px;resize:none;min-height:42px;max-height:120px;}
.composer button,.tools button{padding:10px 14px;background:#0c2d0c;border:1px solid #397a39;color:#9fff9f;font:inherit;font-weight:bold;cursor:pointer;}
.tools{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:8px 10px;border-top:1px solid #174117;}
.tools button{width:100%;}
.call{border-color:#55a955!important;}
.video{border-color:#5b8db8!important;color:#a9d5ff!important;}
.danger{border-color:#a95555!important;color:#ff9f9f!important;}
.attach{border-color:#7a9f55!important;}
.hidden{display:none!important;}
.callview{display:none;position:relative;flex:1;min-height:0;background:#000;overflow:hidden;}
.callview.active{display:block;}
.remote{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000;}
.local{position:absolute;right:14px;bottom:14px;width:30%;max-width:190px;aspect-ratio:4/3;object-fit:cover;background:#010301;border:1px solid #65ff65;z-index:3;}
.callinfo{position:absolute;left:12px;top:10px;z-index:3;padding:5px 8px;background:#020502dd;border:1px solid #397a39;color:#9fff9f;font-size:12px;}
.callcontrols{position:absolute;left:0;right:0;bottom:0;z-index:3;display:flex;justify-content:center;padding:12px;background:linear-gradient(transparent,#020502dd);}
.callcontrols button{padding:10px 18px;background:#0c2d0c;border:1px solid #a95555;color:#ff9f9f;font:inherit;font-weight:bold;cursor:pointer;}
.video-mode .messages,.video-mode .tools,.video-mode .composer{display:none;}
.video-mode .callview{display:block;}
.incoming{display:none;margin:10px;border:1px solid #5b8db8;background:#071007;padding:12px;}
.incoming .caller{color:#a9d5ff;margin-bottom:10px;}
.incoming button{padding:8px 12px;margin-right:8px;background:#0c2d0c;border:1px solid #397a39;color:#9fff9f;font:inherit;font-weight:bold;}
.incoming .reject{border-color:#a95555;color:#ff9f9f;}
</style>
` +
// ===== END PART 1a =====
// ===== PART 1b =====
`
</head>
<body>
<main>
  <div class="top"><div class="brand">CHAT</div><div id="status" class="status">[ OFFLINE ]</div></div>
  <section id="setup" class="setup">
    <h2>./join-room</h2><p>Enter your identity and private room code.</p>
    <input id="name" maxlength="40" placeholder="username">
    <input id="room" maxlength="64" placeholder="room_code">
    <button id="join">[ EXECUTE JOIN ]</button>
    <div class="hint">Use the same room code on both devices.</div>
  </section>
  <section id="chat" class="chat">
    <div class="messages" id="messages"></div>
    <div id="incoming" class="incoming">
      <div id="caller" class="caller"></div>
      <button id="accept">[accept]</button>
      <button id="reject" class="reject">[reject]</button>
    </div>
    <div id="callview" class="callview">
      <div id="callinfo" class="callinfo"></div>
      <video id="remote" class="remote" autoplay playsinline></video>
      <video id="local" class="local" autoplay muted playsinline></video>
      <div class="callcontrols"><button id="leave2" class="danger">[end a.v...]</button></div>
    </div>
    <audio id="remoteAudio" autoplay></audio>
    <div class="tools">
      <button id="voice" class="call">[start a...]</button>
      <button id="video" class="video">[start v...]</button>
      <button id="leave" class="danger">[end a.v...]</button>
    </div>
    <div id="replyBar" class="reply-bar hidden">
      <div id="replyBarText"></div>
      <button id="cancelReply">×</button>
    </div>
    <div class="composer">
      <textarea id="text" maxlength="2000" placeholder="type_message..." autocomplete="off"></textarea>
      <button id="attach" class="attach">[attach]</button>
      <input id="file" type="file" class="hidden">
      <button id="send">SEND</button>
    </div>
  </section>
</main>
<script>
let name='', room='', ws=null, pc=null, localStream=null, pendingCandidates=[], callKind='', callTimeout=null, incomingOffer=null, incomingCaller='', replyTo=null, presenceTimer=null, activeCallId=null, reconnectTimer=null, reconnectAttempt=0, signalQueue=[], disconnectedTimer=null, peerStatus='WAITING...', socketFailure='No WebSocket connection yet';
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const FALLBACK_ICE_SERVERS=[{urls:'stun:stun.cloudflare.com:3478'},{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}];
let activeIceServers=FALLBACK_ICE_SERVERS;
// Always connect signaling to the production Worker, even when the UI is embedded
// or opened through a custom/legacy hostname.
const CHAT_SERVER_ORIGIN='https://asus.redmipad1.workers.dev';
async function loadIceServers(){try{const r=await fetch('/api/ice-servers',{cache:'no-store'});if(r.ok){const data=await r.json();if(Array.isArray(data.iceServers)&&data.iceServers.length)return data.iceServers;}}catch(e){console.warn('TURN credentials unavailable; using STUN fallback',e);}return FALLBACK_ICE_SERVERS;}
function setStatus(x){$('status').textContent='[ '+x+' ]';}
function showReplyBar(m){replyTo=m;const preview=(m.text||m.filename||'attachment').replace(/\s+/g,' ').slice(0,80);$('replyBarText').textContent='Replying to '+m.sender+': '+preview;$('replyBar').classList.remove('hidden');$('text').placeholder='Replying to '+m.sender+': '+preview;$('text').focus();}
function cancelReply(){replyTo=null;$('replyBarText').textContent='';$('replyBar').classList.add('hidden');$('text').placeholder='type_message...';$('text').focus();}
$('cancelReply').onclick=cancelReply;
function fmtSize(n){return n<1024?n+' B':n<1048576?(n/1024).toFixed(1)+' KB':(n/1048576).toFixed(2)+' MB';}
function setupLongPress(element,callback){let timer=null,moved=false;const start=(e)=>{if(e.type==='mousedown'&&e.button!==0)return;moved=false;clearTimeout(timer);timer=setTimeout(()=>{if(!moved)callback();},600);};const move=()=>{moved=true;clearTimeout(timer);};const end=()=>{clearTimeout(timer);};element.addEventListener('touchstart',start,{passive:true});element.addEventListener('touchmove',move,{passive:true});element.addEventListener('touchend',end,{passive:true});element.addEventListener('touchcancel',end,{passive:true});element.addEventListener('mousedown',start);element.addEventListener('mousemove',move);element.addEventListener('mouseup',end);element.addEventListener('mouseleave',end);}
function add(m){
  const d=document.createElement('div');
  d.className='msg '+(m.sender===name?'mine':'');
  d.dataset.messageId=String(m.id);
  const time=m.created_at?new Date(Number(m.created_at)).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):'';
  let replyHtml='';
  if(m.reply_to&&m.reply_sender){const replyText=String(m.reply_text||'attachment');replyHtml='<div class="reply-preview" data-reply-id="'+esc(m.reply_to)+'"><span class="reply-who">'+esc(m.reply_sender)+'</span><span class="reply-text">'+esc(replyText.slice(0,120))+'</span></div>';}
  if(m.type==='attachment'){
    d.innerHTML='<span class="who">'+esc(m.sender)+'</span>'+replyHtml+'<a class="attachment" target="_blank" rel="noopener" href="/api/attachments/'+encodeURIComponent(m.id)+'?room='+encodeURIComponent(room)+'"><span>[ '+esc(m.filename)+' ]</span><small>'+esc(fmtSize(m.size))+' · expires in 2 days</small><span class="msg-time">'+esc(time)+'</span></a>';
  }else{
    d.innerHTML='<span class="who">'+esc(m.sender)+'</span>'+replyHtml+'<span class="msg-text">'+esc(m.text||'')+'</span><span class="msg-time">'+esc(time)+'</span>';
  }
  const desktopPointer=window.matchMedia&&window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if(desktopPointer||(m.sender===name&&m.type!=='attachment')){
    const actions=document.createElement('div');
    actions.className='message-actions';
    if(desktopPointer){
      const replyBtn=document.createElement('button');
      replyBtn.type='button';
      replyBtn.className='reply-message';
      replyBtn.textContent='[REPLY]';
      replyBtn.addEventListener('click',e=>{e.stopPropagation();showReplyBar(m);d.classList.remove('show-actions');});
      actions.appendChild(replyBtn);
    }
    if(m.sender===name&&m.type!=='attachment'){
      const editBtn=document.createElement('button');
      editBtn.type='button';
      editBtn.className='edit-message';
      editBtn.textContent='[EDIT]';
      editBtn.addEventListener('click',e=>{e.stopPropagation();editMessage(m);});
      const deleteBtn=document.createElement('button');
      deleteBtn.type='button';
      deleteBtn.className='delete-message';
      deleteBtn.textContent='[DLT]';
      deleteBtn.addEventListener('click',e=>{e.stopPropagation();deleteMessage(m);});
      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);
      setupLongPress(d,()=>{d.classList.toggle('show-actions');});
    }
    d.appendChild(actions);
    d.addEventListener('contextmenu',e=>{e.preventDefault();d.classList.add('show-actions');});
  }
  let startX=0,startY=0,swiping=false;
  d.addEventListener('touchstart',e=>{if(e.touches.length!==1)return;startX=e.touches[0].clientX;startY=e.touches[0].clientY;swiping=false;d.classList.remove('reply-ready');},{passive:true});
  d.addEventListener('touchmove',e=>{if(e.touches.length!==1)return;const dx=e.touches[0].clientX-startX;const dy=e.touches[0].clientY-startY;if(Math.abs(dy)>Math.abs(dx))return;if(dx>5){swiping=true;const amount=Math.min(dx,80);d.style.transform='translateX('+amount+'px)';d.classList.toggle('reply-ready',dx>=55);}},{passive:true});
  d.addEventListener('touchend',()=>{if(swiping&&d.classList.contains('reply-ready')){showReplyBar(m);}d.style.transform='';d.classList.remove('reply-ready');swiping=false;},{passive:true});
  d.addEventListener('touchcancel',()=>{d.style.transform='';d.classList.remove('reply-ready');swiping=false;},{passive:true});
  d.querySelector('.reply-preview')?.addEventListener('click',()=>{const preview=d.querySelector('.reply-preview');if(!preview)return;const targetId=preview.dataset.replyId;const target=document.querySelector('.msg[data-message-id="'+CSS.escape(String(targetId))+'"]');if(!target)return;target.scrollIntoView({behavior:'smooth',block:'center'});target.classList.add('reply-highlight');setTimeout(()=>target.classList.remove('reply-highlight'),1200);});
  $('messages').appendChild(d);
  requestAnimationFrame(()=>{$('messages').scrollTop=$('messages').scrollHeight;});
}
async function history(){const r=await fetch('/api/messages?room='+encodeURIComponent(room));if(r.ok){for(const m of await r.json())add(m);}}
async function send(){const text=$('text').value.trim();if(!text)return;$('text').value='';const replyId=replyTo&&replyTo.id?replyTo.id:null;const r=await fetch('/api/messages',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({room,name,text,replyTo:replyId})});if(!r.ok){alert('message: send failed');$('text').value=text;return;}cancelReply();}
async function uploadFile(){const input=$('file');const f=input.files[0];if(!f)return;const MAX=1400000;async function compressImage(file){if(!file.type.startsWith('image/')||file.type==='image/gif'||file.type==='image/svg+xml')return file;if(file.size<=MAX)return file;let bitmap;try{bitmap=await createImageBitmap(file);}catch{return file;}let w=bitmap.width,h=bitmap.height;const maxDim=1920;if(Math.max(w,h)>maxDim){const scale=maxDim/Math.max(w,h);w=Math.max(1,Math.round(w*scale));h=Math.max(1,Math.round(h*scale));}const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');if(!ctx){bitmap.close();return file;}ctx.drawImage(bitmap,0,0,w,h);bitmap.close();for(const quality of [0.85,0.75,0.65,0.55,0.45,0.35,0.25]){const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));if(blob&&blob.size<=MAX){const base=(file.name||'image').replace(/\.[^.]+$/,'');return new File([blob],base+'.jpg',{type:'image/jpeg',lastModified:Date.now()});}}return file;}try{setStatus('COMPRESSING...');const upload=await compressImage(f);if(upload.size>MAX){alert('attachment is too large even after compression. Maximum is 1.4 MB.');input.value='';setStatus('ONLINE');return;}setStatus('UPLOADING...');const fd=new FormData();fd.append('room',room);fd.append('name',name);fd.append('file',upload,upload.name);const r=await fetch('/api/attachments',{method:'POST',body:fd});if(!r.ok){let e='upload failed';try{e=(await r.json()).error||e;}catch{}throw new Error(e);}input.value='';setStatus('ONLINE');}catch(e){console.error(e);input.value='';setStatus('UPLOAD FAILED');alert(e.message||'attachment upload failed');}}
function newCallId(){
  if(window.crypto&&typeof window.crypto.randomUUID==='function')return window.crypto.randomUUID();
  return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
}
function formatLastSeen(value){
  const time=Number(value);
  if(!Number.isFinite(time)||time<=0)return 'LAST SEEN UNAVAILABLE';
  const seconds=Math.max(0,Math.floor((Date.now()-time)/1000));
  if(seconds<60)return 'LAST SEEN JUST NOW';
  const minutes=Math.floor(seconds/60);
  if(minutes<60)return 'LAST SEEN '+minutes+'m AGO';
  const hours=Math.floor(minutes/60);
  if(hours<24)return 'LAST SEEN '+hours+'h AGO';
  const days=Math.floor(hours/24);
  if(days<30)return 'LAST SEEN '+days+'d AGO';
  return 'LAST SEEN '+new Date(time).toLocaleString();
}
function applyPeerStatus(x){
  peerStatus=x.online?'PEER ONLINE':x.lastSeen?formatLastSeen(x.lastSeen):'WAITING FOR THE OTHER PERSON';
  if(!pc&&!incomingOffer)setStatus(peerStatus);
}
function sendSignal(message){
  const payload=JSON.stringify(message);
  if(ws&&ws.readyState===WebSocket.OPEN){
    try{ws.send(payload);return;}catch(e){console.warn('Signal send failed; queued',e);}
  }
  if(signalQueue.length<128)signalQueue.push(payload);
  connectSocket();
}
function flushSignalQueue(){
  if(!ws||ws.readyState!==WebSocket.OPEN)return;
  while(signalQueue.length){
    try{ws.send(signalQueue[0]);signalQueue.shift();}
    catch(e){console.warn('Signal queue flush failed',e);break;}
  }
}
function updateCallButton(state){
  const button=callKind==='video' ? $('video') : $('voice');
  if(!button)return;
  const labels={connecting:'[connecting...]',connected:callKind==='video'?'[connected v]':'[connected a]',failed:'[call failed]',waiting:'[calling...]',idle:callKind==='video'?'[start v...]':'[start a...]'};
  button.textContent=labels[state]||labels.idle;
}
function showIncoming(x){
  incomingOffer=x;
  activeCallId=x.callId||('legacy-'+Date.now());
  if(x.callId)pendingCandidates=pendingCandidates.filter(item=>!item.callId||item.callId===x.callId);
  incomingCaller=x.from||'unknown';
  $('caller').textContent='['+(x.video?'video':'voice')+' call from '+incomingCaller+']';
  $('incoming').style.display='block';
  setStatus('INCOMING '+(x.video?'VIDEO':'VOICE')+' CALL');
}
function hideIncoming(){
  incomingOffer=null;
  incomingCaller='';
  $('incoming').style.display='none';
}
function startTimeout(){
  clearCallTimeout();
  callTimeout=setTimeout(()=>{
    if(pc&&pc.connectionState!=='connected'){
      hangup(true);
      setStatus('CALL TIMEOUT · CHECK NETWORK');
    }
  },45000);
}
function clearCallTimeout(){
  if(callTimeout){clearTimeout(callTimeout);callTimeout=null;}
  if(disconnectedTimer){clearTimeout(disconnectedTimer);disconnectedTimer=null;}
}
function showVideoMode(){
  if(callKind==='video'){
    $('chat').classList.add('video-mode');
    $('callinfo').textContent='[ VIDEO CALL ]';
  }
}
function hideVideoMode(){
  $('chat').classList.remove('video-mode');
  $('remote').srcObject=null;
  $('local').srcObject=null;
  $('remoteAudio').srcObject=null;
}
function makePeer(video){
  const connection=new RTCPeerConnection({iceServers:activeIceServers,iceCandidatePoolSize:4,bundlePolicy:'max-bundle'});
  pc=connection;
  connection.onicecandidate=e=>{
    if(e.candidate&&pc===connection){
      sendSignal({type:'candidate',callId:activeCallId,candidate:e.candidate.toJSON?e.candidate.toJSON():e.candidate});
    }
  };
  connection.ontrack=e=>{
    if(pc!==connection)return;
    const stream=e.streams&&e.streams[0]?e.streams[0]:new MediaStream([e.track]);
    if(video){
      $('remote').srcObject=stream;
      $('remote').play().catch(err=>console.warn('Remote video autoplay blocked',err));
      showVideoMode();
    }else{
      $('remoteAudio').srcObject=stream;
      $('remoteAudio').play().catch(err=>console.warn('Remote audio autoplay blocked',err));
    }
  };
  connection.onconnectionstatechange=()=>{
    if(pc!==connection)return;
    const state=connection.connectionState;
    if(state==='connected'){
      clearCallTimeout();
      setStatus(video?'VIDEO CALL CONNECTED':'VOICE CALL CONNECTED');
      updateCallButton('connected');
    }else if(state==='disconnected'){
      setStatus('CALL INTERRUPTED · RECONNECTING');
      updateCallButton('connecting');
      if(disconnectedTimer)clearTimeout(disconnectedTimer);
      disconnectedTimer=setTimeout(()=>{
        if(pc===connection&&connection.connectionState==='disconnected'){
          hangup(false);
          setStatus('CALL DISCONNECTED');
        }
      },12000);
    }else if(state==='failed'){
      hangup(false);
      setStatus('CALL FAILED · NETWORK OR RELAY UNAVAILABLE');
    }
  };
  connection.oniceconnectionstatechange=()=>{
    if(pc!==connection)return;
    const state=connection.iceConnectionState;
    if(state==='connected'||state==='completed'){
      clearCallTimeout();
      setStatus(video?'VIDEO CALL CONNECTED':'VOICE CALL CONNECTED');
      updateCallButton('connected');
    }else if(state==='failed'){
      hangup(false);
      setStatus('ICE FAILED · CHECK TURN CONFIGURATION');
    }
  };
  return connection;
}
async function addPending(){
  if(!pc||!pc.remoteDescription)return;
  const queued=pendingCandidates;
  pendingCandidates=[];
  for(const item of queued){
    if(item.callId&&activeCallId&&item.callId!==activeCallId)continue;
    try{await pc.addIceCandidate(item.candidate);}
    catch(e){console.warn('Queued ICE candidate rejected',e);}
  }
}
async function startCall(video){
  if(pc||incomingOffer)return;
  try{
    await waitForSocketConnection(12000);
  }catch(error){
    console.warn('Chat signaling socket is not ready',error);
    updateCallButton('idle');
    setStatus('CHAT SERVER DISCONNECTED');
    alert('Chat server is still disconnected. '+(error.message||'Check your connection and try again.'));
    return;
  }
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){
    alert('Calling requires HTTPS and browser media support.');
    return;
  }
  callKind=video?'video':'voice';
  activeCallId=newCallId();
  pendingCandidates=[];
  updateCallButton('connecting');
  setStatus(video?'STARTING VIDEO CALL...':'STARTING VOICE CALL...');
  try{
    activeIceServers=await loadIceServers();
    localStream=await navigator.mediaDevices.getUserMedia({audio:true,video:!!video});
    if(video){
      $('local').srcObject=localStream;
      $('local').play().catch(()=>{});
      showVideoMode();
    }
    const connection=makePeer(!!video);
    localStream.getTracks().forEach(track=>connection.addTrack(track,localStream));
    const offer=await connection.createOffer();
    await connection.setLocalDescription(offer);
    sendSignal({type:'offer',callId:activeCallId,sdp:connection.localDescription.sdp,video:!!video});
    updateCallButton('waiting');
    setStatus(video?'VIDEO CALLING...':'VOICE CALLING...');
    startTimeout();
  }catch(e){
    console.error('Could not start call',e);
    hangup(false);
    setStatus('CALL FAILED');
    alert(e.name==='NotAllowedError'?'Camera or microphone permission was denied.':'Unable to access camera or microphone: '+(e.message||e.name));
  }
}
async function acceptIncoming(){
  const offer=incomingOffer;
  if(!offer)return;
  hideIncoming();
  callKind=offer.video?'video':'voice';
  activeCallId=offer.callId||activeCallId||('legacy-'+Date.now());
  updateCallButton('connecting');
  setStatus('ACCEPTING '+(offer.video?'VIDEO':'VOICE')+' CALL...');
  try{
    activeIceServers=await loadIceServers();
    localStream=await navigator.mediaDevices.getUserMedia({audio:true,video:!!offer.video});
    if(offer.video){
      $('local').srcObject=localStream;
      $('local').play().catch(()=>{});
      showVideoMode();
    }
    const connection=makePeer(!!offer.video);
    localStream.getTracks().forEach(track=>connection.addTrack(track,localStream));
    const remoteDescription=offer.offer&&typeof offer.offer==='object'?offer.offer:{type:'offer',sdp:offer.sdp};
    await connection.setRemoteDescription(remoteDescription);
    await addPending();
    const answer=await connection.createAnswer();
    await connection.setLocalDescription(answer);
    sendSignal({type:'answer',callId:activeCallId,sdp:connection.localDescription.sdp});
    setStatus('CALL ANSWER SENT · CONNECTING...');
    startTimeout();
  }catch(e){
    console.error('Could not accept call',e);
    sendSignal({type:'reject',callId:activeCallId});
    hangup(false);
    setStatus('CALL FAILED');
    alert(e.name==='NotAllowedError'?'Camera or microphone permission was denied.':'Unable to accept call: '+(e.message||e.name));
  }
}
function rejectIncoming(){
  const id=activeCallId;
  hideIncoming();
  if(id)sendSignal({type:'reject',callId:id});
  activeCallId=null;
  setStatus(peerStatus);
}
function hangup(send=true){
  const id=activeCallId;
  clearCallTimeout();
  if(send&&id)sendSignal({type:'hangup',callId:id});
  if(pc){
    const connection=pc;
    pc=null;
    connection.onicecandidate=null;
    connection.ontrack=null;
    connection.onconnectionstatechange=null;
    connection.oniceconnectionstatechange=null;
    try{connection.close();}catch(e){console.warn('Peer close failed',e);}
  }
  if(localStream){
    localStream.getTracks().forEach(track=>{try{track.stop();}catch(e){console.warn('Track stop failed',e);}});
    localStream=null;
  }
  pendingCandidates=[];
  hideIncoming();
  activeCallId=null;
  callKind='';
  hideVideoMode();
  $('remote').srcObject=null;
  $('local').srcObject=null;
  $('remoteAudio').srcObject=null;
  $('chat').classList.remove('video-mode');
  $('voice').textContent='[start a...]';
  $('video').textContent='[start v...]';
  if(ws&&ws.readyState===WebSocket.OPEN)setStatus(peerStatus);
}
async function handleSignal(x){
  try{
    if(x.type==='offer'){
      if(pc||incomingOffer){sendSignal({type:'busy',callId:x.callId});return;}
      showIncoming(x);
      return;
    }
    if(x.type==='candidate'){
      if(x.callId&&activeCallId&&x.callId!==activeCallId)return;
      const candidate={callId:x.callId||activeCallId,candidate:x.candidate};
      if(!pc||!pc.remoteDescription){
        if(pendingCandidates.length<256)pendingCandidates.push(candidate);
      }else{
        try{await pc.addIceCandidate(x.candidate);}
        catch(e){console.warn('ICE candidate add failed',e);}
      }
      return;
    }
    if(x.callId&&activeCallId&&x.callId!==activeCallId)return;
    if(x.type==='answer'&&pc){
      const answer=x.answer&&typeof x.answer==='object'?x.answer:{type:'answer',sdp:x.sdp};
      await pc.setRemoteDescription(answer);
      await addPending();
      startTimeout();
    }else if(x.type==='hangup'){
      hangup(false);
      setStatus('CALL ENDED');
    }else if(x.type==='reject'){
      hangup(false);
      setStatus('CALL REJECTED BY '+(x.from||'PEER'));
    }else if(x.type==='busy'){
      hangup(false);
      setStatus('PEER BUSY');
    }
  }catch(e){
    console.error('Signaling handler failed',e);
    hangup(false);
    setStatus('CALL SIGNALING FAILED');
  }
}
function connectSocket(){
  if(!room||!name)return;
  if(ws&&(ws.readyState===WebSocket.OPEN||ws.readyState===WebSocket.CONNECTING))return;
  clearTimeout(reconnectTimer);
  let socket;
  try{
    const socketBase=new URL(CHAT_SERVER_ORIGIN);
    socketBase.protocol='wss:';
    socketBase.pathname='/ws';
    socketBase.search='';
    socketBase.searchParams.set('room',room);
    socketBase.searchParams.set('name',name);
    socket=new WebSocket(socketBase.toString());
  }catch(e){
    setStatus('CONNECTION ERROR · RETRYING');
    scheduleReconnect();
    return;
  }
  ws=socket;
  socketFailure='WebSocket connection attempt in progress';
  const handshakeTimeout=setTimeout(()=>{
    if(ws===socket&&socket.readyState===WebSocket.CONNECTING){
      console.warn('WebSocket handshake timed out');
      try{socket.close();}catch(e){console.warn('Could not close timed-out socket',e);}
    }
  },10000);
  socket.onopen=()=>{
    if(ws!==socket)return;
    clearTimeout(handshakeTimeout);
    socketFailure='';
    reconnectAttempt=0;
    if(presenceTimer)clearInterval(presenceTimer);
    socket.send(JSON.stringify({type:'heartbeat'}));
    presenceTimer=setInterval(()=>{
      if(ws===socket&&socket.readyState===WebSocket.OPEN){
        try{socket.send(JSON.stringify({type:'heartbeat'}));}catch(e){console.warn('Heartbeat failed',e);}
      }
    },15000);
    flushSignalQueue();
    if(!pc&&!incomingOffer)setStatus('CONNECTED · '+peerStatus);
  };
  socket.onclose=event=>{
    clearTimeout(handshakeTimeout);
    if(ws!==socket)return;
    socketFailure='WebSocket closed with code '+event.code+(event.reason?' ('+event.reason+')':'');
    if(presenceTimer)clearInterval(presenceTimer);
    presenceTimer=null;
    setStatus((pc?'CALL ACTIVE · SIGNALING RECONNECTING':'DISCONNECTED · RECONNECTING')+' · '+event.code);
    scheduleReconnect();
  };
  socket.onerror=()=>{
    if(ws!==socket)return;
    socketFailure='WebSocket handshake/network error (browser does not expose the HTTP response)';
    if(!pc)setStatus('CONNECTION ERROR · RETRYING');
    try{socket.close();}catch(e){console.warn('WebSocket close after error failed',e);}
  };
  socket.onmessage=e=>{
    if(ws!==socket)return;
    try{
      const x=JSON.parse(e.data);
      if(x.type==='message'||x.type==='attachment'){add(x);}
      else if(x.type==='peer'){applyPeerStatus(x);}
      else if(x.type==='message_edit'){
        const target=document.querySelector('.msg[data-message-id="'+CSS.escape(String(x.id))+'"]');
        if(target){
          const textEl=target.querySelector('.msg-text');
          if(textEl){
            textEl.textContent=x.text||'';
            const edited=document.createElement('span');
            edited.className='edited-label';
            edited.textContent=' (edited)';
            textEl.appendChild(edited);
          }
        }
      }else if(x.type==='message_delete'){
        const target=document.querySelector('.msg[data-message-id="'+CSS.escape(String(x.id))+'"]');
        if(target)target.remove();
      }else if(['offer','answer','candidate','hangup','reject','busy'].includes(x.type)){
        handleSignal(x);
      }
    }catch(error){console.error('WebSocket message error',error);}
  };
}
function scheduleReconnect(){
  clearTimeout(reconnectTimer);
  const delay=Math.min(15000,1000*Math.pow(2,reconnectAttempt++));
  reconnectTimer=setTimeout(()=>{reconnectTimer=null;ws=null;connectSocket();},delay);
}
async function waitForSocketConnection(timeout=12000){
  const deadline=Date.now()+timeout;
  setStatus('CONNECTING TO CHAT SERVER...');
  while(Date.now()<deadline){
    if(ws&&ws.readyState===WebSocket.OPEN)return ws;
    const socketClosed=!ws||ws.readyState===WebSocket.CLOSED||ws.readyState===WebSocket.CLOSING;
    if(socketClosed&&!reconnectTimer)connectSocket();
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  const readyState=ws?['CONNECTING','OPEN','CLOSING','CLOSED'][ws.readyState]||String(ws.readyState):'NO_SOCKET';
  const endpoint=ws&&ws.url?ws.url:CHAT_SERVER_ORIGIN+'/ws';
  throw new Error('WebSocket connection timed out. Last result: '+(socketFailure||'no close/error event received')+'; state='+readyState+'; endpoint='+endpoint);
}
$('join').onclick=async()=>{
  name=$('name').value.trim();
  room=$('room').value.trim();
  if(!name||!room){alert('username and room_code required');return;}
  sessionStorage.setItem('twochatName',name);
  sessionStorage.setItem('twochatRoom',room);
  $('join').disabled=true;
  setStatus('CONNECTING...');
  try{
    await history();
    $('setup').classList.add('hidden');
    $('chat').style.display='flex';
    connectSocket();
  }catch(e){
    console.error('Join failed',e);
    $('join').disabled=false;
    setStatus('JOIN FAILED');
    alert(e.message||'Could not join room');
  }
};

$('text').addEventListener('keydown',e=>{
  const desktopKeyboard=window.matchMedia&&window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if(desktopKeyboard&&e.key==='Enter'&&!e.shiftKey&&!e.isComposing){
    e.preventDefault();
    send();
  }
});
$('send').onclick=send;$('attach').onclick=()=>{$('file').click();};$('file').onchange=uploadFile;$('voice').onclick=()=>{startCall(false);};$('video').onclick=()=>{startCall(true);};$('leave').onclick=()=>{hangup();};$('leave2').onclick=()=>{hangup();};$('accept').onclick=acceptIncoming;$('reject').onclick=rejectIncoming;
const sn=sessionStorage.getItem('twochatName');const sr=sessionStorage.getItem('twochatRoom');if(sn)$('name').value=sn;if(sr)$('room').value=sr;
window.addEventListener('beforeunload',()=>{if(presenceTimer)clearInterval(presenceTimer);clearTimeout(reconnectTimer);clearCallTimeout();});
async function editMessage(m){
  if(!m || m.sender!==name) return;
  const current=m.text||'';
  const next=prompt('Edit message:', current);
  // Hide the action menu immediately, whether they cancel or not
  const msg=document.querySelector('.msg[data-message-id="'+CSS.escape(String(m.id))+'"]');
  if(msg) msg.classList.remove('show-actions');
  if(next===null || !next.trim() || next===current) return;
  try{
    const res=await fetch('/api/messages/edit', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({id:m.id, room, name, text:next.trim()})
    });
    const data=await res.json();
    if(!res.ok) throw new Error(data.error||'Edit failed');
    if(msg){
      const textEl=msg.querySelector('.msg-text');
      if(textEl) textEl.textContent=next.trim();
      let editedLabel=msg.querySelector('.edited-label');
      if(!editedLabel){
        editedLabel=document.createElement('span');
        editedLabel.className='edited-label';
        editedLabel.textContent=' (edited)';
        textEl?.appendChild(editedLabel);
      }
      msg.classList.remove('show-actions');
    }
  }catch(e){
    console.error('edit message error', e);
    alert(e.message||'Could not edit message.');
    // Ensure actions are hidden even if error
    if(msg) msg.classList.remove('show-actions');
  }
}

async function deleteMessage(m){
  if(!m || m.sender!==name) return;
  const msg=document.querySelector('.msg[data-message-id="'+CSS.escape(String(m.id))+'"]');
  if(!confirm('Delete this message?')){
    // User cancelled – hide actions
    if(msg) msg.classList.remove('show-actions');
    return;
  }
  try{
    const res=await fetch('/api/messages/delete', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({id:m.id, room, name})
    });
    const data=await res.json();
    if(!res.ok) throw new Error(data.error||'Delete failed');
    if(msg) msg.remove(); // element removed, so actions disappear
  }catch(e){
    console.error('delete message error', e);
    alert(e.message||'Could not delete message.');
    // Hide actions if deletion failed
    if(msg) msg.classList.remove('show-actions');
  }
}
</script>
</body>
</html>
`;
// ===== END PART 1b =====
// ===== PART 2 (FIXED) =====
// Add this helper at the top
async function ensureMessagesTable(env){
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room TEXT NOT NULL,
      sender TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      reply_to INTEGER,
      edited_at INTEGER
    )
  `).run();
  await env.DB.prepare(`
    CREATE INDEX IF NOT EXISTS idx_messages_room_created ON messages(room, created_at)
  `).run();
}

async function ensureAttachmentTable(env){
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS attachments (id INTEGER PRIMARY KEY AUTOINCREMENT, room TEXT NOT NULL, sender TEXT NOT NULL, filename TEXT NOT NULL, mime_type TEXT NOT NULL, size INTEGER NOT NULL, data BLOB NOT NULL, created_at INTEGER NOT NULL)`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_attachments_room_created ON attachments(room, created_at)`).run();
}
async function ensureMessageReplyColumn(env){
  try{ await env.DB.prepare('ALTER TABLE messages ADD COLUMN reply_to INTEGER').run(); }catch{}
}
async function ensureMessageEditColumn(env){
  try{ await env.DB.prepare('ALTER TABLE messages ADD COLUMN edited_at INTEGER').run(); }catch(e){ if(!String(e.message).toLowerCase().includes('duplicate')) console.error('edited_at column check',e); }
}

export default{
  async fetch(request,env){
    const url=new URL(request.url);
    if(request.method==='OPTIONS') return new Response(null,{headers:CORS});
    if(url.pathname==='/'||url.pathname==='/index.html') return new Response(HTML,{headers:{'content-type':'text/html;charset=UTF-8','cache-control':'no-store, no-cache, must-revalidate'}});
    if(url.pathname==='/ws'){
      if((request.headers.get('Upgrade')||'').toLowerCase()!=='websocket') return new Response('WebSocket required',{status:426});
      const room=clean(url.searchParams.get('room')), name=clean(url.searchParams.get('name'));
      if(!room||!name) return new Response('room and name required',{status:400,headers:CORS});
      if(request.method!=='GET') return new Response('WebSocket GET required',{status:405,headers:CORS});
      const id=env.ROOMS.idFromName(room);
      // Preserve the original Upgrade request when proxying into the Durable Object.
      try { return await env.ROOMS.get(id).fetch(request); }
      catch(error) {
        console.error('WebSocket upgrade forwarding failed',error);
        return new Response('WebSocket upgrade failed: '+String(error&&error.message||error),{status:502,headers:CORS});
      }
    }
    if(url.pathname==='/api/socket-check' && request.method==='GET'){
      const room=clean(url.searchParams.get('room'));
      if(!room) return json({ok:false,error:'room query parameter required'},400);
      try{
        const probe=await env.ROOMS.get(env.ROOMS.idFromName(room)).fetch('https://room/health');
        const body=await probe.json();
        return json({ok:probe.ok,durableObject:body},probe.ok?200:502);
      }catch(error){
        console.error('Durable Object health probe failed',error);
        return json({ok:false,error:String(error&&error.message||error)},502);
      }
    }
    if(url.pathname==='/api/ice-servers' && request.method==='GET'){
      const fallback=[{urls:'stun:stun.cloudflare.com:3478'},{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}];
      if(!env.TURN_KEY_ID||!env.TURN_API_TOKEN) return json({iceServers:fallback,turnAvailable:false},200);
      try{
        const response=await fetch('https://rtc.live.cloudflare.com/v1/turn/keys/'+encodeURIComponent(env.TURN_KEY_ID)+'/credentials/generate-ice-servers',{
          method:'POST',
          headers:{'Authorization':'Bearer '+env.TURN_API_TOKEN,'Content-Type':'application/json'},
          body:JSON.stringify({ttl:43200})
        });
        if(!response.ok){
          console.error('TURN credential request failed',response.status,await response.text());
          return json({iceServers:fallback,turnAvailable:false},200);
        }
        const data=await response.json();
        if(!Array.isArray(data.iceServers)||!data.iceServers.length) return json({iceServers:fallback,turnAvailable:false},200);
        return json({iceServers:data.iceServers,turnAvailable:true},200);
      }catch(error){
        console.error('TURN credential generation failed',error);
        return json({iceServers:fallback,turnAvailable:false},200);
      }
    }
    if(url.pathname==='/api/messages' && request.method==='GET'){
      const room=clean(url.searchParams.get('room'));
      if(!room) return json({error:'room required'},400);
      await ensureMessagesTable(env);
      await ensureAttachmentTable(env);
      await ensureMessageReplyColumn(env);
      await ensureMessageEditColumn(env);
      const [mr,ar]=await Promise.all([
        env.DB.prepare(`SELECT m.id,m.room,m.sender,m.text,m.created_at,m.reply_to,r.sender AS reply_sender,r.text AS reply_text FROM messages m LEFT JOIN messages r ON r.id=m.reply_to WHERE m.room=? ORDER BY m.id DESC LIMIT 200`).bind(room).all(),
        env.DB.prepare(`SELECT id,room,sender,filename,mime_type,size,created_at FROM attachments WHERE room=? AND created_at>=? ORDER BY id DESC LIMIT 200`).bind(room,Date.now()-172800000).all()
      ]);
      const results=[...mr.results, ...ar.results.map(x=>({...x,type:'attachment'}))].sort((a,b)=>a.created_at-b.created_at);
      return json(results.slice(-200),200);
    }
    if(url.pathname==='/api/messages' && request.method==='POST'){
      let b; try{ b=await request.json(); }catch{ return json({error:'invalid JSON'},400); }
      await ensureMessagesTable(env);
      await ensureMessageReplyColumn(env);
      await ensureMessageEditColumn(env);
      const room=clean(b.room), sender=clean(b.name), text=String(b.text||'').slice(0,2000), replyTo=Number.isInteger(b.replyTo)?b.replyTo:null;
      if(!room||!sender||!text) return json({error:'room, name and text required'},400);
      let replySender=null, replyText=null;
      if(replyTo){ const replied=await env.DB.prepare(`SELECT sender,text FROM messages WHERE id=? AND room=? LIMIT 1`).bind(replyTo,room).first(); if(replied){ replySender=replied.sender; replyText=replied.text; } }
      const now=Date.now();
      const r=await env.DB.prepare(`INSERT INTO messages(room,sender,text,created_at,reply_to) VALUES(?,?,?,?,?)`).bind(room,sender,text,now,replyTo).run();
      const message={id:r.meta.last_row_id,room,sender,text,created_at:now,reply_to:replyTo,reply_sender:replySender,reply_text:replyText,type:'message'};
      const id=env.ROOMS.idFromName(room);
      await env.ROOMS.get(id).fetch('https://room/broadcast',{method:'POST',body:JSON.stringify(message)});
      return json(message,201);
    }
    // ========== FIXED EDIT ==========
    if(url.pathname==='/api/messages/edit' && request.method==='POST'){
      await ensureMessagesTable(env);
      try{
        const b=await request.json();
        const id=Number(b.id);
        const room=clean(b.room);
        const sender=clean(b.name);
        const text=String(b.text||'').trim().slice(0,2000);
        if(!Number.isInteger(id)||!room||!sender||!text)
          return json({error:'id, room, name and text required'},400);
        // Get message – no 'type' column
        const message=await env.DB.prepare(`SELECT id,sender,room FROM messages WHERE id=? AND room=? LIMIT 1`).bind(id,room).first();
        if(!message) return json({error:'message not found'},404);
        if(message.sender!==sender) return json({error:'not allowed'},403);
        // Attachments are in a separate table, so we don't need to check type
        const editedAt=Date.now();
        await env.DB.prepare(`UPDATE messages SET text=?, edited_at=? WHERE id=? AND room=?`).bind(text,editedAt,id,room).run();
        return json({ok:true, id, room, sender, text, edited_at:editedAt});
      }catch(e){
        console.error('message edit error',e);
        return json({error:'edit failed'},500);
      }
    }
    // ========== FIXED DELETE ==========
    if(url.pathname==='/api/messages/delete' && request.method==='POST'){
      await ensureMessagesTable(env);
      try{
        const b=await request.json();
        const id=Number(b.id);
        const room=clean(b.room);
        const sender=clean(b.name);
        if(!Number.isInteger(id)||!room||!sender)
          return json({error:'id, room and name required'},400);
        const message=await env.DB.prepare(`SELECT id,sender,room FROM messages WHERE id=? AND room=? LIMIT 1`).bind(id,room).first();
        if(!message) return json({error:'message not found'},404);
        if(message.sender!==sender) return json({error:'not allowed'},403);
        await env.DB.prepare(`DELETE FROM messages WHERE id=? AND room=?`).bind(id,room).run();
        return json({ok:true, id});
      }catch(e){
        console.error('message delete error',e);
        return json({error:'delete failed'},500);
      }
    }
    // ... attachments, scheduled, utilities, Room class (Part 3 & 4 unchanged) ...
// ===== END PART 2 (FIXED) =====
    // ===== PART 3 =====
    if(url.pathname==='/api/attachments' && request.method==='POST'){
      try{ await ensureAttachmentTable(env); const form=await request.formData(); const room=clean(form.get('room')); const sender=clean(form.get('name')); const file=form.get('file'); if(!room||!sender||!file||typeof file.arrayBuffer!=='function') return json({error:'room, name and file required'},400); if(file.size>MAX_ATTACHMENT_BYTES) return json({error:'attachment too large; maximum is 1.4 MB'},413); const filename=String(file.name||'attachment').slice(0,180); const mime=String(file.type||'application/octet-stream').slice(0,120); const data=await file.arrayBuffer(); const now=Date.now(); const r=await env.DB.prepare(`INSERT INTO attachments(room,sender,filename,mime_type,size,data,created_at) VALUES(?,?,?,?,?,?,?)`).bind(room,sender,filename,mime,file.size,data,now).run(); const message={id:r.meta.last_row_id,room,sender,filename,mime_type:mime,size:file.size,created_at:now,type:'attachment'}; const id=env.ROOMS.idFromName(room); await env.ROOMS.get(id).fetch('https://room/broadcast',{method:'POST',body:JSON.stringify(message)}); return json(message,201); }catch(e){ console.error('attachment upload',e); return json({error:'attachment upload failed'},500); }
    }
    if(url.pathname.startsWith('/api/attachments/') && request.method==='GET'){
      await ensureAttachmentTable(env); const id=Number(url.pathname.split('/').pop()); const room=clean(url.searchParams.get('room')); if(!Number.isInteger(id)||id<1||!room) return new Response('Not found',{status:404,headers:CORS}); const row=await env.DB.prepare(`SELECT filename,mime_type,size,data,created_at FROM attachments WHERE id=? AND room=?`).bind(id,room).first(); if(!row||Date.now()-Number(row.created_at)>=172800000) return new Response('Attachment expired',{status:410,headers:CORS}); const bytes=new Uint8Array(row.data); return new Response(bytes,{headers:{...CORS,'content-type':row.mime_type||'application/octet-stream','content-length':String(row.size),'content-disposition':'inline; filename="'+String(row.filename).replace(/["\\\r\n]/g,'_')+'"','cache-control':'private, max-age=300'}});
    }
    return json({name:'Asus vs Redmi API',status:'ok',endpoints:['/api/messages','/api/attachments','/ws']},200);
  },
  async scheduled(event,env,ctx){ ctx.waitUntil((async()=>{ try{ await ensureAttachmentTable(env); const now=Date.now(); await env.DB.prepare('DELETE FROM attachments WHERE created_at < ?').bind(now-172800000).run(); await env.DB.prepare('DELETE FROM messages WHERE created_at < ?').bind(now-2592000000).run(); }catch(e){ console.error('retention cleanup',e); } })()); }
};

function clean(v){ return String(v||'').trim().slice(0,128); }
function json(data,status){ return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json',...CORS}}); }
// ===== END PART 3 =====

// ===== PART 4 (FIXED – correct online status on join) =====
export class Room {
  constructor(state) {
    this.state = state;
    this.clients = new Map(); // WebSocket -> { name, lastActivity }
    this.participants = new Set();
    this.lastSeen = {};
    this.ready = this.state.blockConcurrencyWhile(async () => {
      const saved = await this.state.storage.get('presence-v1');
      if (saved && typeof saved === 'object') {
        this.participants = new Set(Array.isArray(saved.participants) ? saved.participants : []);
        this.lastSeen = saved.lastSeen && typeof saved.lastSeen === 'object' ? saved.lastSeen : {};
      }
    });
  }

  async fetch(request) {
    await this.ready;
    const url = new URL(request.url);

    if (url.pathname === '/health' && request.method === 'GET') {
      return json({ ok: true, durableObject: 'Room', ready: true }, 200);
    }

    if (url.pathname === '/broadcast' && request.method === 'POST') {
      const message = await request.json();
      this.broadcast(message);
      return new Response('ok');
    }

    if (url.pathname === '/ws') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      const name = String(url.searchParams.get('name') || 'Guest').trim().slice(0, 128);
      if (!name) return new Response('name required', { status: 400 });
      server.accept();

      this.clients.set(server, { name, lastActivity: Date.now() });
      this.participants.add(name);
      await this.persistPresence();
      await this.sendStatusToAll();

      server.addEventListener('message', event => {
        this.handleClientMessage(server, name, event.data).catch(error => {
          console.error('Room signaling message failed', error);
        });
      });

      server.addEventListener('close', () => {
        this.handleDisconnect(server, name).catch(error => {
          console.error('Room disconnect handling failed', error);
        });
      });

      server.addEventListener('error', () => {
        this.handleDisconnect(server, name).catch(error => {
          console.error('Room socket error handling failed', error);
        });
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response('not found', { status: 404 });
  }

  async handleClientMessage(server, name, raw) {
    const client = this.clients.get(server);
    if (!client) return;
    let message;
    try {
      message = JSON.parse(raw);
    } catch {
      return;
    }

    client.lastActivity = Date.now();
    if (message.type === 'heartbeat' || message.type === 'presence') {
      const pruned = await this.pruneStaleClients();
      if (pruned) {
        await this.persistPresence();
        await this.sendStatusToAll();
      }
      return;
    }

    if (['offer', 'answer', 'candidate', 'hangup', 'reject', 'busy'].includes(message.type)) {
      this.broadcast({ ...message, from: name }, server);
    }
  }

  async handleDisconnect(server, name) {
    const client = this.clients.get(server);
    if (!client) return;
    this.clients.delete(server);
    if (!this.hasActiveClient(name)) this.lastSeen[name] = Date.now();
    await this.persistPresence();
    await this.sendStatusToAll();
  }

  hasActiveClient(name) {
    for (const client of this.clients.values()) {
      if (client.name === name) return true;
    }
    return false;
  }

  async pruneStaleClients() {
    const now = Date.now();
    let changed = false;
    for (const [socket, client] of this.clients) {
      if (now - client.lastActivity <= 45000) continue;
      this.clients.delete(socket);
      if (!this.hasActiveClient(client.name)) {
        this.lastSeen[client.name] = client.lastActivity;
      }
      try { socket.close(1001, 'Presence timeout'); } catch {}
      changed = true;
    }
    return changed;
  }

  async persistPresence() {
    await this.state.storage.put('presence-v1', {
      participants: Array.from(this.participants),
      lastSeen: this.lastSeen
    });
  }

  async sendStatusToAll() {
    const pruned = await this.pruneStaleClients();
    if (pruned) await this.persistPresence();
    const active = Array.from(this.clients.values());
    for (const [socket, client] of this.clients) {
      const onlinePeer = active.find(peer => peer.name !== client.name) || null;
      const otherNames = Array.from(this.participants).filter(peerName => peerName !== client.name);
      otherNames.sort((a, b) => Number(this.lastSeen[b] || 0) - Number(this.lastSeen[a] || 0));
      const peerName = onlinePeer ? onlinePeer.name : (otherNames[0] || null);
      const status = {
        type: 'peer',
        online: !!onlinePeer,
        peerName,
        lastSeen: onlinePeer || !peerName ? null : (Number(this.lastSeen[peerName]) || null)
      };
      try {
        socket.send(JSON.stringify(status));
      } catch (error) {
        console.warn('Could not send room presence status', error);
      }
    }
  }

  broadcast(message, except = null) {
    for (const socket of this.clients.keys()) {
      if (socket === except) continue;
      try {
        socket.send(JSON.stringify(message));
      } catch (error) {
        console.warn('Room broadcast failed', error);
      }
    }
  }
}
// ===== END PART 4 =====
  
