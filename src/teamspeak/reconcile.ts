import type { TeamSpeakClient } from 'ts3-nodejs-library';

/**
 * Minimal information we keep about a client to be able to detect drift
 * between what we told our api clients and what the teamspeak server actually
 * reports.
 */
export type SnapshotEntry = {
  clid: string;
  cid: string;
  uid: string;
  nickname: string;
  client: TeamSpeakClient;
};

export type ClientSnapshot = Map<string, SnapshotEntry>;

export type SnapshotDiff = {
  joined: SnapshotEntry[];
  left: SnapshotEntry[];
  moved: Array<{ entry: SnapshotEntry; fromCid: string; toCid: string }>;
};

export const toSnapshotEntry = (client: TeamSpeakClient): SnapshotEntry => ({
  clid: client.clid,
  cid: client.cid,
  uid: client.uniqueIdentifier,
  nickname: client.nickname,
  client,
});

export const snapshotClients = (clients: TeamSpeakClient[]): ClientSnapshot =>
  new Map(clients.map((c) => [c.clid, toSnapshotEntry(c)]));

/**
 * Compares the last known state with the current state of the server.
 *
 * A clid is only unique while a client is connected, the teamspeak server
 * reuses it later on. If the clid stayed the same but the unique identifier
 * changed, this is a different person and has to be reported as a
 * disconnect + connect instead of a move.
 */
export const diffSnapshots = (
  prev: ClientSnapshot,
  next: ClientSnapshot,
): SnapshotDiff => {
  const diff: SnapshotDiff = { joined: [], left: [], moved: [] };

  for (const [clid, entry] of next) {
    const before = prev.get(clid);
    if (!before) {
      diff.joined.push(entry);
      continue;
    }
    if (before.uid !== entry.uid) {
      diff.left.push(before);
      diff.joined.push(entry);
      continue;
    }
    if (before.cid !== entry.cid) {
      diff.moved.push({ entry, fromCid: before.cid, toCid: entry.cid });
    }
  }

  for (const [clid, entry] of prev) {
    if (!next.has(clid)) diff.left.push(entry);
  }

  return diff;
};

export const diffSize = (diff: SnapshotDiff): number =>
  diff.joined.length + diff.left.length + diff.moved.length;

export const describeDiff = (diff: SnapshotDiff): string =>
  [
    `joined=${diff.joined.length}`,
    `left=${diff.left.length}`,
    `moved=${diff.moved.length}`,
  ].join(' ');
