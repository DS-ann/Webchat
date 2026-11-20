# TwoChat / Webchat

A private room-based chat with text messaging, attachments, message replies, editing/deletion, and WebRTC voice/video calls.

## Single deployment

The Cloudflare Worker is the only production deployment. It serves the embedded chat interface, REST API, WebSocket signaling, media ICE configuration, and Durable Object room service from one origin:

`https://asus.redmipad1.workers.dev`

- `/` serves the chat interface.
- `/api/messages` stores and retrieves room messages in D1.
- `/api/attachments` handles room-scoped attachments.
- `/api/ice-servers` returns STUN or short-lived TURN ICE configuration.
- `/ws` handles room presence and WebRTC signaling through a Durable Object.

GitHub Pages is not required and is not part of the production request path. The embedded HTML and JavaScript in `cloudflare/src/worker.js` are the production frontend source of truth.

## Deploy the Worker

The repository's `cloudflare/wrangler.toml` targets the existing Worker named `asus`, with the existing D1 database and Durable Object binding. From `cloudflare/`, deploy with:

```bash
npx wrangler deploy
```

Do not create a new D1 database or Durable Object namespace for this repair; keep the existing bindings and data.

## Calling and presence

WebRTC calls use trickle ICE, call-session IDs, queued early ICE candidates, and a reconnecting signaling WebSocket. Audio-only calls use a dedicated audio playback element; video calls render both camera streams. Presence heartbeats keep the room's online status fresh, while last-seen timestamps persist in Durable Object storage.

STUN-only connectivity works on many networks, but not all NAT/firewall combinations. To enable relay fallback, set the Worker secrets `TURN_KEY_ID` and `TURN_API_TOKEN` after creating a Cloudflare Realtime TURN key and an API token permitted to generate short-lived ICE credentials. The Worker never exposes the long-lived token to browsers. Without those secrets, `/api/ice-servers` safely returns the configured public STUN fallback.

## Privacy

The room code is the room access credential. Anyone who knows it can join, so use a long random code and do not publish it. Voice and video are peer-to-peer when direct connectivity succeeds; relay traffic is used only when TURN is configured and selected by WebRTC.
