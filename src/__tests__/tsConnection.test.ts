import { afterAll, beforeAll, expect, test } from 'bun:test';
import type { ClientConnect, ClientDisconnect } from '~/teamspeak/WsEvent.ts';
import { TsMockServer } from './tsMockServer.ts';

const mock = new TsMockServer();
let ts3: typeof import('~/teamspeak/ts3.ts');
let tsEventEmitter: typeof import('~/teamspeak/tsEventEmitter.ts').tsEventEmitter;

beforeAll(async () => {
  const port = await mock.listen();
  mock.setClientsSilently([
    { clid: '1', cid: '1', uid: 'uid-alice', nickname: 'alice' },
  ]);

  // env is read at import time
  process.env.TS3_HOST = '127.0.0.1';
  process.env.TS3_QUERY_PORT = String(port);
  process.env.TS3_USERNAME = 'serveradmin';
  process.env.TS3_PASSWORD = 'secret';
  process.env.TS3_NICKNAME = 'test-bot';
  process.env.TS3_RECONCILE_INTERVAL_MS = '5000';
  process.env.LOG_LEVEL ??= 'error';

  ts3 = await import('~/teamspeak/ts3.ts');
  tsEventEmitter = (await import('~/teamspeak/tsEventEmitter.ts'))
    .tsEventEmitter;
});

afterAll(async () => {
  await mock.close();
});

test('connects and takes an initial snapshot without emitting events', async () => {
  const seen: string[] = [];
  const listener = (e: ClientConnect) => seen.push(e.client.nickname);
  tsEventEmitter.on('clientconnect', listener);

  const ts = await ts3.getTeamspeakInstance();
  expect(ts).toBeDefined();

  const health = ts3.getTsHealth();
  expect(health.state).toBe('connected');
  expect(health.knownClients).toBe(1);
  // the initial snapshot must not replay the already connected users
  expect(seen).toEqual([]);

  tsEventEmitter.off('clientconnect', listener);
});

test('registers for server and channel events on connect', () => {
  const registered = mock.receivedCommands.filter((c) =>
    c.startsWith('servernotifyregister'),
  );
  expect(registered.some((c) => c.includes('event=server'))).toBe(true);
  expect(registered.some((c) => c.includes('event=channel'))).toBe(true);
});

test('a dropped teamspeak connection is reported and reconnected, and missed changes are repaired', async () => {
  const connects: string[] = [];
  const disconnects: string[] = [];
  const states: string[] = [];
  const onConnect = (e: ClientConnect) => connects.push(e.client.nickname);
  const onDisconnect = (e: ClientDisconnect) =>
    disconnects.push(e.client?.nickname ?? '?');
  const onState = (e: { state: string }) => states.push(e.state);

  tsEventEmitter.on('clientconnect', onConnect);
  tsEventEmitter.on('clientdisconnect', onDisconnect);
  tsEventEmitter.on('tsstate', onState);

  // while we are disconnected alice leaves and bob joins - the notifications
  // for both are lost, previously leaving every viewer stuck on "alice"
  mock.dropConnections();
  mock.setClientsSilently([
    { clid: '2', cid: '1', uid: 'uid-bob', nickname: 'bob' },
  ]);

  await waitFor(() => states.includes('reconnected'), 20_000);

  expect(states[0]).toBe('disconnected');
  expect(states).toContain('reconnected');
  expect(connects).toEqual(['bob']);
  expect(disconnects).toEqual(['alice']);
  expect(ts3.getTsHealth().state).toBe('connected');
  expect(ts3.getTsHealth().driftDetected).toBeGreaterThan(0);
  expect(ts3.getTsHealth().knownClients).toBe(1);

  tsEventEmitter.off('clientconnect', onConnect);
  tsEventEmitter.off('clientdisconnect', onDisconnect);
  tsEventEmitter.off('tsstate', onState);
}, 30_000);

test('the reconcile poll repairs a silently missed event', async () => {
  const connects: string[] = [];
  const onConnect = (e: ClientConnect) => connects.push(e.client.nickname);
  tsEventEmitter.on('clientconnect', onConnect);

  // carol joins but the server never sends the notification
  mock.setClientsSilently([
    { clid: '2', cid: '1', uid: 'uid-bob', nickname: 'bob' },
    { clid: '3', cid: '2', uid: 'uid-carol', nickname: 'carol' },
  ]);

  await waitFor(() => connects.includes('carol'), 20_000);
  expect(ts3.getTsHealth().knownClients).toBe(2);

  tsEventEmitter.off('clientconnect', onConnect);
}, 30_000);

const waitFor = async (predicate: () => boolean, timeoutMs: number) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await Bun.sleep(100);
  }
  throw new Error('timed out waiting for condition');
};
