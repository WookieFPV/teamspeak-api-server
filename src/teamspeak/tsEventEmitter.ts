import { EventEmitter } from 'node:events';
import type {
  ClientConnect,
  ClientDisconnect,
  ClientMoved,
  TsConnectionState,
} from '~/teamspeak/WsEvent.ts';

// typed event emitter for teamspeak 3 events
export const tsEventEmitter = new EventEmitter<{
  clientconnect: [ClientConnect];
  clientdisconnect: [ClientDisconnect];
  clientmoved: [ClientMoved];
  tsstate: [TsConnectionState];
}>();

// every websocket connection adds one listener per event. The node default of
// 10 would print a "possible EventEmitter memory leak" warning once more than
// 10 viewers are connected, which is a perfectly normal amount here.
tsEventEmitter.setMaxListeners(1000);
