import { randomUUID } from 'node:crypto';
import type { ServerWebSocket } from 'bun';
import type { WSContext } from 'hono/ws';
import { env } from '~/env.ts';
import { createLogger } from '~/logger.ts';
import {
  ensureTsConnection,
  getTeamspeakInstance,
  getTsHealth,
} from '~/teamspeak/ts3.ts';
import { tsEventEmitter } from '~/teamspeak/tsEventEmitter.ts';
import {
  type ClientConnect,
  type ClientDisconnect,
  type ClientMoved,
  stringifyWsEvent,
  type TsConnectionState,
  type TsWsEvent,
} from '~/teamspeak/WsEvent.ts';
import { upgradeWebSocket } from '~/websocket.ts';

const log = createLogger('WS');

type Listeners = {
  clientconnect: (e: ClientConnect) => void;
  clientdisconnect: (e: ClientDisconnect) => void;
  clientmoved: (e: ClientMoved) => void;
  tsstate: (e: TsConnectionState) => void;
};

type WsConnection = {
  id: string;
  connectedAt: number;
  listeners: Listeners | null;
  heartbeatTimer: ReturnType<typeof setInterval> | null;
  sent: number;
  dropped: number;
  closed: boolean;
};

/** all currently open websocket connections, used for logging and /ts/health */
const connections = new Set<WsConnection>();

export const getWsHealth = () => ({
  openConnections: connections.size,
  connections: [...connections].map((c) => ({
    id: c.id,
    connectedSeconds: Math.round((Date.now() - c.connectedAt) / 1000),
    sent: c.sent,
    dropped: c.dropped,
  })),
});

const OPEN = 1;

/**
 * Sends an event to a single websocket.
 *
 * Hono's WSContext swallows the return value of bun's `send()` and snapshots
 * `readyState` when the context is created, so a message that never reaches
 * the client would be lost silently. We therefore talk to the raw bun socket
 * and log every drop.
 */
const safeSend = (
  conn: WsConnection,
  ws: WSContext,
  event: TsWsEvent,
): boolean => {
  const raw = ws.raw as ServerWebSocket | undefined;
  try {
    if (!raw) {
      ws.send(stringifyWsEvent(event));
      conn.sent++;
      return true;
    }
    if (raw.readyState !== OPEN) {
      conn.dropped++;
      log.warn(
        `[${conn.id}] drop ${event.type}: socket not open (readyState ${raw.readyState})`,
      );
      return false;
    }
    const written = raw.send(stringifyWsEvent(event));
    if (written === 0) {
      conn.dropped++;
      log.warn(`[${conn.id}] drop ${event.type}: send returned 0`);
      return false;
    }
    if (written === -1) {
      log.warn(`[${conn.id}] backpressure while sending ${event.type}`);
    }
    conn.sent++;
    return true;
  } catch (e) {
    // never let one broken socket break event delivery for the other clients:
    // an exception here would abort EventEmitter.emit for all later listeners
    conn.dropped++;
    log.error(
      `[${conn.id}] send ${event.type} failed: ${e instanceof Error ? e.message : String(e)}`,
    );
    return false;
  }
};

const cleanup = (conn: WsConnection, reason: string) => {
  if (conn.closed) return;
  conn.closed = true;

  if (conn.listeners) {
    tsEventEmitter.off('clientconnect', conn.listeners.clientconnect);
    tsEventEmitter.off('clientdisconnect', conn.listeners.clientdisconnect);
    tsEventEmitter.off('clientmoved', conn.listeners.clientmoved);
    tsEventEmitter.off('tsstate', conn.listeners.tsstate);
    conn.listeners = null;
  }
  if (conn.heartbeatTimer) {
    clearInterval(conn.heartbeatTimer);
    conn.heartbeatTimer = null;
  }
  connections.delete(conn);

  log.info(
    `[${conn.id}] closed (${reason}) duration=${printTimeDiff(conn.connectedAt)} sent=${conn.sent} dropped=${conn.dropped} (open: ${connections.size})`,
  );
};

/**
 * The WebSocket server is used to listen to events from the TeamSpeak server.
 */
export const apiTsWs = upgradeWebSocket((_) => {
  const conn: WsConnection = {
    id: randomUUID().slice(0, 8),
    connectedAt: Date.now(),
    listeners: null,
    heartbeatTimer: null,
    sent: 0,
    dropped: 0,
    closed: false,
  };

  return {
    onMessage(msg) {
      log.debug(`[${conn.id}] message: ${String(msg.data).slice(0, 200)}`);
    },

    onOpen(_, ws) {
      conn.connectedAt = Date.now();
      connections.add(conn);
      log.info(`[${conn.id}] open (open connections: ${connections.size})`);

      // Register the listeners *before* any await: an async gap here means
      // events that happen while connecting are lost, and a rejected promise
      // (teamspeak unreachable) used to leave the socket open forever without
      // any subscription at all - the client then sat on stale data until it
      // reconnected on its own.
      conn.listeners = {
        clientconnect: (e) => safeSend(conn, ws, { type: 'clientConnect', e }),
        clientdisconnect: (e) =>
          safeSend(conn, ws, { type: 'clientDisconnect', e }),
        clientmoved: (e) => safeSend(conn, ws, { type: 'clientMoved', e }),
        tsstate: (e) =>
          safeSend(
            conn,
            ws,
            e.state === 'disconnected'
              ? { type: 'tsDisconnected', reason: e.reason }
              : { type: 'tsReconnected', repaired: e.repaired },
          ),
      };
      tsEventEmitter.on('clientconnect', conn.listeners.clientconnect);
      tsEventEmitter.on('clientdisconnect', conn.listeners.clientdisconnect);
      tsEventEmitter.on('clientmoved', conn.listeners.clientmoved);
      tsEventEmitter.on('tsstate', conn.listeners.tsstate);

      conn.heartbeatTimer = setInterval(() => {
        const raw = ws.raw as ServerWebSocket | undefined;
        if (raw && raw.readyState !== OPEN) {
          // bun did not call onClose for us (yet) - stop leaking the listeners
          cleanup(conn, 'heartbeat found dead socket');
          return;
        }
        const health = getTsHealth();
        safeSend(conn, ws, {
          type: 'heartbeat',
          sentAt: Date.now(),
          tsConnected: health.state === 'connected',
          clientCount: health.knownClients,
        });
      }, env.WS_HEARTBEAT_INTERVAL_MS);

      // keep the teamspeak connection (and its reconnect loop) alive for as
      // long as websocket clients are listening
      ensureTsConnection();

      getTeamspeakInstance()
        .then(() => {
          if (conn.closed) return;
          safeSend(conn, ws, { type: 'connected' });
        })
        .catch((e) => {
          log.error(
            `[${conn.id}] teamspeak not available on open: ${e instanceof Error ? e.message : String(e)}`,
          );
          if (!conn.closed) {
            safeSend(conn, ws, {
              type: 'tsDisconnected',
              reason: 'teamspeak query connection unavailable',
            });
          }
        });
    },

    onClose(evt, _ws) {
      cleanup(conn, `code ${evt.code}`);
    },

    onError(err, _ws) {
      log.error(`[${conn.id}] socket error`, err);
      cleanup(conn, 'error');
    },
  };
});

const printTimeDiff = (start: number) => {
  return `${Math.round((Date.now() - start) / 1000)}s`;
};
