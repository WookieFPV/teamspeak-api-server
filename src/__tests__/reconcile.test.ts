import { describe, expect, test } from 'bun:test';
import type { TeamSpeakClient } from 'ts3-nodejs-library';
import {
  type ClientSnapshot,
  describeDiff,
  diffSize,
  diffSnapshots,
  snapshotClients,
} from '~/teamspeak/reconcile.ts';

const client = (clid: string, cid: string, uid = `uid-${clid}`) =>
  ({
    clid,
    cid,
    uniqueIdentifier: uid,
    nickname: `user-${clid}`,
  }) as TeamSpeakClient;

const snapshot = (...clients: TeamSpeakClient[]): ClientSnapshot =>
  snapshotClients(clients);

describe('diffSnapshots', () => {
  test('reports no drift for identical state', () => {
    const a = snapshot(client('1', '10'), client('2', '20'));
    const b = snapshot(client('1', '10'), client('2', '20'));
    const diff = diffSnapshots(a, b);
    expect(diffSize(diff)).toBe(0);
    expect(describeDiff(diff)).toBe('joined=0 left=0 moved=0');
  });

  test('detects clients that joined while we were not listening', () => {
    const diff = diffSnapshots(
      snapshot(client('1', '10')),
      snapshot(client('1', '10'), client('2', '20')),
    );
    expect(diff.joined.map((e) => e.clid)).toEqual(['2']);
    expect(diff.left).toHaveLength(0);
    expect(diff.moved).toHaveLength(0);
  });

  test('detects clients that left while we were not listening', () => {
    const diff = diffSnapshots(
      snapshot(client('1', '10'), client('2', '20')),
      snapshot(client('1', '10')),
    );
    expect(diff.left.map((e) => e.clid)).toEqual(['2']);
    expect(diff.joined).toHaveLength(0);
  });

  test('detects a channel switch as a move', () => {
    const diff = diffSnapshots(
      snapshot(client('1', '10')),
      snapshot(client('1', '99')),
    );
    expect(diff.moved).toHaveLength(1);
    expect(diff.moved[0]?.fromCid).toBe('10');
    expect(diff.moved[0]?.toCid).toBe('99');
  });

  test('treats a reused clid as leave + join, not as a move', () => {
    // teamspeak hands out clids again after a client disconnected
    const diff = diffSnapshots(
      snapshot(client('1', '10', 'alice')),
      snapshot(client('1', '20', 'bob')),
    );
    expect(diff.moved).toHaveLength(0);
    expect(diff.left.map((e) => e.uid)).toEqual(['alice']);
    expect(diff.joined.map((e) => e.uid)).toEqual(['bob']);
  });

  test('handles a full outage where everyone changed', () => {
    const diff = diffSnapshots(
      snapshot(client('1', '10'), client('2', '10')),
      snapshot(client('3', '20')),
    );
    expect(diffSize(diff)).toBe(3);
    expect(diff.joined.map((e) => e.clid)).toEqual(['3']);
    expect(diff.left.map((e) => e.clid).sort()).toEqual(['1', '2']);
  });

  test('an empty previous snapshot reports everyone as joined', () => {
    const diff = diffSnapshots(new Map(), snapshot(client('1', '10')));
    expect(diff.joined).toHaveLength(1);
  });
});
