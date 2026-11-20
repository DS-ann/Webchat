# TwoChat

A small 1-to-1 browser chat with WebRTC voice/video calling.

## Architecture

- `chat/` is the static GitHub Pages frontend.
- `cloudflare/` is the Cloudflare Worker API/signaling backend.
- Cloudflare D1 stores the last 200 messages per room.
- A Durable Object relays WebRTC signaling between the two browsers.
- Audio/video is peer-to-peer via WebRTC; it is not stored by this project.

## Deploy the backend

1. Install Wrangler and log in to Cloudflare.
2. From `cloudflare/`, create a D1 database named `twochat`.
3. Put the returned database ID into `wrangler.toml` as `database_id`.
4. Run the D1 migration.
5. Deploy the Worker.
6. Copy the Worker HTTPS URL into `chat/config.js`.
7. Commit/push `config.js`; GitHub Pages will deploy the `chat/` directory.

Example commands:

```bash
cd cloudflare
npx wrangler d1 create twochat
npx wrangler d1 migrations apply twochat --remote
npx wrangler deploy
```

Do not put Cloudflare API tokens or secrets in `chat/` or any browser JavaScript.

## Privacy note

The room code is the access credential in this first version. Anyone who knows it can join that room, so use a long random code and don't publish it.


## Calling reliability and presence

Voice and video calls use WebRTC with trickle ICE. The browser queues ICE candidates until the remote description is ready, and the signaling client reconnects if its WebSocket drops. Room presence is maintained by the Durable Object, with last-seen timestamps stored in Durable Object storage.

### Optional TURN relay (recommended)

STUN is enough on some networks, but it cannot relay media through every NAT or firewall. To enable Cloudflare TURN fallback:

1. Create a TURN key in Cloudflare Realtime and create an API token with permission to generate TURN credentials.
2. From `cloudflare/`, set the two values as Worker secrets:

   ```bash
   npx wrangler secret put TURN_KEY_ID
   npx wrangler secret put TURN_API_TOKEN
   ```

3. Deploy the Worker again.

The Worker exposes `GET /api/ice-servers`, generates short-lived ICE credentials server-side, and returns them to the calling browsers. The long-lived token is never included in the static frontend. When TURN secrets are not configured, the endpoint falls back to public STUN servers; calls may still fail on restrictive networks.

Cloudflare's [TURN credential guide](https://developers.cloudflare.com/realtime/turn/generate-credentials/) describes key creation and the short-lived credential API.
