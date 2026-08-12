import type { TeamSpeakChannel } from 'ts3-nodejs-library/lib/node/Channel.ts';
import type { TeamSpeakClient } from 'ts3-nodejs-library/lib/node/Client';

export type TsWsEvent =
  | {
      type: 'clientConnect';
      e: ClientConnect;
    }
  | {
      type: 'clientDisconnect';
      e: ClientDisconnect;
    }
  | {
      type: 'clientMoved';
      e: ClientMoved;
    }
  | {
      type: 'connected';
    }
  /** the teamspeak query connection dropped, events may be missed from now on */
  | {
      type: 'tsDisconnected';
      reason: string;
    }
  /**
   * the teamspeak query connection is back. `repaired` is the number of
   * synthetic events that were emitted to catch up on the outage, clients
   * should do a full refresh when they see this event.
   */
  | {
      type: 'tsReconnected';
      repaired: number;
    }
  /**
   * Periodic liveness signal. A client that stops receiving heartbeats knows
   * its data is stale even when the socket still looks open (half open tcp).
   */
  | {
      type: 'heartbeat';
      sentAt: number;
      tsConnected: boolean;
      clientCount: number;
    };

export const stringifyWsEvent = (wsEvent: TsWsEvent): string =>
  JSON.stringify(wsEvent);

export interface ClientConnect {
  client: TeamSpeakClient;
}

export interface ClientDisconnect {
  client?: TeamSpeakClient;
  event: {
    cfid: string;
    ctid: string;
    reasonid: string;
    reasonmsg: string;
    clid: string;
    invokerid?: string;
    invokername?: string;
    invokeruid?: string;
    bantime?: number;
  };
}

export interface ClientMoved {
  client: TeamSpeakClient;
  channel: TeamSpeakChannel;
  reasonid: string;
}

/** state changes of the teamspeak query connection */
export type TsConnectionState =
  | { state: 'disconnected'; reason: string }
  | { state: 'reconnected'; repaired: number };
