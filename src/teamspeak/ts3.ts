import PQueue from 'p-queue';
import type { TeamSpeak, TeamSpeakClient } from 'ts3-nodejs-library';

import { env } from '~/env.ts';
import { createLogger, isDebugEnabled } from '~/logger.ts';
import {
  type ClientSnapshot,
  describeDiff,
  diffSize,
  diffSnapshots,
  snapshotClients,
} from '~/teamspeak/reconcile.ts';
import { tsEventEmitter } from '~/teamspeak/tsEventEmitter.ts';
import { tsConnect } from './ts-base';

const log = createLogger('TS');
const queue = new PQueue({ concurrency: 1 });

const RECONNECT_MIN_DELAY_MS = 3_000;
const RECONNECT_MAX_DELAY_MS = 60_000;
/** consecutive failing reconcile polls before the connection is considered dead */
const MAX_FAILED_POLLS = 3;

export const getClients = async (ts: TeamSpeak): Promise<TeamSpeakClient[]> => {
  return (await ts.clientList()).filter((c) => c.type === 0);
};

export const findClient = async (
  ts: TeamSpeak,
  name: string,
): Promise<TeamSpeakClient | undefined> => {
  return (await ts.clientList()).find((c) => c.nickname === name);
};

type ConnectionState = 'disconnected' | 'connecting' | 'connected';

type Connection = {
  id: number;
  ts: TeamSpeak;
  /** set when we tear the connection down on purpose, stops auto reconnect */
  disposed: boolean;
  reconcileTimer: ReturnType<typeof setInterval> | null;
  failedPolls: number;
};

let state: ConnectionState = 'disconnected';
let connection: Connection | null = null;
let connectionCounter = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempt = 0;
/**
 * Only start reconnecting on our own once we managed to connect at least once
 * or a websocket client is waiting for events. Otherwise a misconfigured
 * server would hammer the teamspeak query port forever.
 */
let autoReconnect = false;
let lastSnapshot: ClientSnapshot = new Map();
let snapshotInitialized = false;

const stats = {
  connects: 0,
  disconnects: 0,
  errors: 0,
  reconnectAttempts: 0,
  reconcileRuns: 0,
  reconcileFailures: 0,
  /** how often the periodic reconcile found state we never told clients about */
  driftDetected: 0,
  repairedEvents: 0,
  lastConnectedAt: null as string | null,
  lastDisconnectedAt: null as string | null,
  lastDisconnectReason: null as string | null,
  lastReconcileAt: null as string | null,
  lastError: null as string | null,
};

export const getTsHealth = () => ({
  state,
  connectionId: connection?.id ?? null,
  knownClients: lastSnapshot.size,
  autoReconnect,
  nextReconnectScheduled: reconnectTimer !== null,
  reconnectAttempt,
  ...stats,
});

const errorMessage = (e: unknown): string =>
  e instanceof Error ? e.message : String(e);

// ---------------------------------------------------------------------------
// reconciliation: repair everything we missed while we were not listening
// ---------------------------------------------------------------------------

/**
 * Fetches the real client list and emits synthetic events for every change we
 * did not report. Without this, a single missed notification (teamspeak
 * reconnect, dropped event, ...) leaves every connected viewer stuck with old
 * data until the next unrelated event happens to arrive.
 *
 * @returns the number of repaired (synthetic) events
 */
const reconcile = async (conn: Connection, reason: string): Promise<number> => {
  stats.reconcileRuns++;
  stats.lastReconcileAt = new Date().toISOString();

  const clients = await getClients(conn.ts);
  const next = snapshotClients(clients);

  if (!snapshotInitialized) {
    lastSnapshot = next;
    snapshotInitialized = true;
    log.info(`reconcile (${reason}): initial snapshot, ${next.size} client(s)`);
    return 0;
  }

  const diff = diffSnapshots(lastSnapshot, next);
  lastSnapshot = next;

  const size = diffSize(diff);
  if (size === 0) {
    log.debug(`reconcile (${reason}): in sync, ${next.size} client(s)`);
    return 0;
  }

  stats.driftDetected++;
  stats.repairedEvents += size;
  log.warn(
    `reconcile (${reason}): DRIFT ${describeDiff(diff)} - clients were out of sync, emitting synthetic events`,
    {
      joined: diff.joined.map((e) => e.nickname),
      left: diff.left.map((e) => e.nickname),
      moved: diff.moved.map(
        (m) => `${m.entry.nickname}:${m.fromCid}->${m.toCid}`,
      ),
    },
  );

  for (const entry of diff.joined) {
    tsEventEmitter.emit('clientconnect', { client: entry.client });
  }

  for (const entry of diff.left) {
    tsEventEmitter.emit('clientdisconnect', {
      client: entry.client,
      event: {
        cfid: entry.cid,
        ctid: '0',
        reasonid: '-1',
        reasonmsg: 'missed while disconnected (reconciled)',
        clid: entry.clid,
      },
    });
  }

  for (const { entry } of diff.moved) {
    const channel = await conn.ts
      .getChannelById(entry.cid)
      .catch(() => undefined);
    if (!channel) {
      log.warn(
        `reconcile: cannot resolve channel ${entry.cid} for moved client ${entry.nickname}, sending connect event instead`,
      );
      tsEventEmitter.emit('clientconnect', { client: entry.client });
      continue;
    }
    tsEventEmitter.emit('clientmoved', {
      client: entry.client,
      channel,
      reasonid: '-1',
    });
  }

  return size;
};

/** periodic self healing + liveness check of the query connection */
const startReconcileTimer = (conn: Connection) => {
  if (conn.reconcileTimer) return;
  conn.reconcileTimer = setInterval(() => {
    if (conn.disposed || connection?.id !== conn.id) return;
    reconcile(conn, 'poll')
      .then(() => {
        conn.failedPolls = 0;
      })
      .catch((e) => {
        conn.failedPolls++;
        stats.reconcileFailures++;
        log.warn(
          `reconcile poll failed (${conn.failedPolls}/${MAX_FAILED_POLLS}): ${errorMessage(e)}`,
        );
        if (conn.failedPolls >= MAX_FAILED_POLLS) {
          // the query connection looks alive but does not answer anymore
          teardown(conn, 'reconcile poll timeout', { reconnect: true });
        }
      });
  }, env.TS3_RECONCILE_INTERVAL_MS);
};

// ---------------------------------------------------------------------------
// connection lifecycle
// ---------------------------------------------------------------------------

const teardown = (
  conn: Connection,
  reason: string,
  opts: { reconnect: boolean },
) => {
  if (conn.disposed) return;
  conn.disposed = true;

  if (conn.reconcileTimer) {
    clearInterval(conn.reconcileTimer);
    conn.reconcileTimer = null;
  }
  conn.ts.removeAllListeners();
  try {
    conn.ts.forceQuit();
  } catch (e) {
    log.debug(`forceQuit failed: ${errorMessage(e)}`);
  }

  const wasCurrent = connection?.id === conn.id;
  if (wasCurrent) {
    connection = null;
    state = 'disconnected';
    stats.disconnects++;
    stats.lastDisconnectedAt = new Date().toISOString();
    stats.lastDisconnectReason = reason;
    log.warn(`connection #${conn.id} lost: ${reason}`);
    tsEventEmitter.emit('tsstate', { state: 'disconnected', reason });
  } else {
    log.info(`stale connection #${conn.id} disposed: ${reason}`);
  }

  if (opts.reconnect && wasCurrent) scheduleReconnect();
};

const scheduleReconnect = () => {
  if (!autoReconnect || reconnectTimer || state !== 'disconnected') return;

  reconnectAttempt++;
  const backoff = Math.min(
    RECONNECT_MIN_DELAY_MS * 2 ** (reconnectAttempt - 1),
    RECONNECT_MAX_DELAY_MS,
  );
  // jitter avoids hitting the teamspeak query flood protection in lockstep
  const delay = Math.round(backoff * (0.8 + Math.random() * 0.4));
  stats.reconnectAttempts++;
  log.info(`reconnect attempt ${reconnectAttempt} scheduled in ${delay}ms`);

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    getTeamspeakInstance().catch((e) => {
      log.warn(
        `reconnect attempt ${reconnectAttempt} failed: ${errorMessage(e)}`,
      );
      scheduleReconnect();
    });
  }, delay);
};

const attachListeners = (conn: Connection) => {
  const { ts } = conn;

  ts.on('error', (e) => {
    stats.errors++;
    stats.lastError = errorMessage(e);
    log.error(`connection #${conn.id} error: ${errorMessage(e)}`);
    teardown(conn, `error: ${errorMessage(e)}`, { reconnect: true });
  });

  ts.on('close', (e) => {
    // we drive reconnects ourselves (see scheduleReconnect) instead of
    // ts.reconnect() so the state, logging and resync stay in one place
    teardown(conn, `closed: ${e ? errorMessage(e) : 'no reason given'}`, {
      reconnect: true,
    });
  });

  ts.on('flooding', (e) => {
    log.warn(`flood protection triggered: ${errorMessage(e)}`);
  });

  ts.on('clientconnect', (e) => {
    if (!e.client) return;
    log.info(`client +: ${e.client.nickname} (cid ${e.client.cid})`);
    lastSnapshot.set(e.client.clid, {
      clid: e.client.clid,
      cid: e.client.cid,
      uid: e.client.uniqueIdentifier,
      nickname: e.client.nickname,
      client: e.client,
    });
    tsEventEmitter.emit('clientconnect', e);
  });

  ts.on('clientdisconnect', (e) => {
    if (!e.client) {
      // clid is always present, the client object is not (unknown to the lib)
      if (e.event?.clid) lastSnapshot.delete(e.event.clid);
      log.info(`client -: unknown client (clid ${e.event?.clid})`);
      return;
    }
    log.info(`client -: ${e.client.nickname}`);
    lastSnapshot.delete(e.client.clid);
    tsEventEmitter.emit('clientdisconnect', e);
  });

  ts.on('clientmoved', (e) => {
    if (!e.client || !e.channel) return;
    log.info(`client mv: ${e.client.nickname} -> ${e.channel.name}`);
    const known = lastSnapshot.get(e.client.clid);
    if (known) known.cid = e.channel.cid;
    tsEventEmitter.emit('clientmoved', e);
  });

  if (isDebugEnabled) {
    ts.on('debug', (data) => log.debug('query debug', data));
  }

  log.debug(`connection #${conn.id}: listeners attached`);
};

/**
 * Returns the shared teamspeak connection, connecting on demand. Concurrent
 * callers share a single connect attempt.
 */
export const getTeamspeakInstance = async (): Promise<TeamSpeak> => {
  const value = await queue.add(async (): Promise<TeamSpeak> => {
    if (connection && !connection.disposed) {
      reconnectAttempt = 0;
      return connection.ts;
    }

    state = 'connecting';
    const conn: Connection = {
      id: ++connectionCounter,
      ts: await tsConnect().catch((e) => {
        state = 'disconnected';
        stats.lastError = errorMessage(e);
        throw e;
      }),
      disposed: false,
      reconcileTimer: null,
      failedPolls: 0,
    };

    connection = conn;
    state = 'connected';
    autoReconnect = true;
    stats.connects++;
    stats.lastConnectedAt = new Date().toISOString();

    attachListeners(conn);
    startReconcileTimer(conn);

    const wasReconnect = conn.id > 1;
    // catch up on everything that happened while we were away, then tell the
    // websocket clients so they can do a full refresh
    const repaired = await reconcile(
      conn,
      wasReconnect ? 'reconnect' : 'connect',
    ).catch((e) => {
      log.warn(`initial reconcile failed: ${errorMessage(e)}`);
      return 0;
    });

    if (wasReconnect) {
      log.info(
        `connection #${conn.id} established (reconnect), repaired ${repaired} missed event(s)`,
      );
      tsEventEmitter.emit('tsstate', { state: 'reconnected', repaired });
    }

    reconnectAttempt = 0;
    return conn.ts;
  });
  if (!value) throw Error('Result from ts queue connect was void');
  return value;
};

/**
 * Makes sure the server keeps (re)connecting in the background, even when no
 * http request comes in. Called when a websocket client subscribes, otherwise
 * a dropped connection would only be repaired by the next rest api call.
 */
export const ensureTsConnection = (): void => {
  autoReconnect = true;
  if (state !== 'disconnected' || reconnectTimer) return;
  getTeamspeakInstance().catch(() => scheduleReconnect());
};
