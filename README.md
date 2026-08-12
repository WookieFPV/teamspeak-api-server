

# Getting Started

1. Add Teamspeak Server Query Login
    - copy `.env.example` to `.env`
    - add data
2. add SSL cert (see [.ssl/Readme.md](.ssl/Readme.md)) 
3. start with `bun run`

# Authentication
Sqlite is used to storage tokens which are needed for the API.\
You can create new token using the API.
To create your first token use 


# Websocket events

`GET /api/ts/ws` streams the following JSON events (field `type`):

| type | meaning |
| --- | --- |
| `connected` | the subscription is active |
| `clientConnect` / `clientDisconnect` / `clientMoved` | a client joined / left / switched channel |
| `tsDisconnected` | the query connection to Teamspeak dropped, **data is potentially stale from now on** |
| `tsReconnected` | connection is back, `repaired` synthetic events were sent to catch up on the outage |
| `heartbeat` | periodic liveness signal (`sentAt`, `tsConnected`, `clientCount`) |

Clients should treat a missing heartbeat (older than ~2 intervals) the same as
a closed socket and do a full refresh via `GET /api/ts/users`.

## Keeping clients in sync

Events can get lost: the query connection to Teamspeak can drop, a notification
can be missed, a websocket send can fail. To make sure no client is left with
old data, the server keeps a snapshot of the client list and compares it with
the real state

- every `TS3_RECONCILE_INTERVAL_MS` (default 60s), and
- directly after every (re)connect to Teamspeak.

Any difference is emitted as regular `clientConnect` / `clientDisconnect` /
`clientMoved` events, so clients repair themselves without needing to know
about the outage. Each repair is logged with a `DRIFT` warning and counted in
`GET /api/ts/health`.

# Debugging / health

`GET /api/ts/health` (needs a token) reports the state of the Teamspeak
connection and of every open websocket:

- `teamspeak.state`, `lastDisconnectReason`, `reconnectAttempt` - is the query connection healthy?
- `teamspeak.driftDetected` / `repairedEvents` - how often events were missed and repaired (should stay near 0)
- `websocket.connections[].dropped` - events that could not be delivered to a client

Set `LOG_LEVEL=debug` for verbose logs (including the raw query protocol).

# Related projects

- Teamspeak3 Viewer for browsers: [teamspeak-web-viewer]( https://github.com/WookieFPV/teamspeak-web-viewer)
- Teamspeak3 Viewer for Elgato Streamdeck: [teamspeak-streamdeck-viewer](https://github.com/WookieFPV/teamspeak-streamdeck-viewer)
- add Rest & Websocket Teamspeak3 APIs to your Teamspeak: [teamspeak-api-server](https://github.com/WookieFPV/teamspeak-api-server)


