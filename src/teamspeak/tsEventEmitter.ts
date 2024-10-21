import { EventEmitter } from 'node:events';
import type {
  ClientConnect,
  ClientDisconnect,
  ClientMoved,
} from '~/teamspeak/WsEvent.ts';

// typed event emitter for teamspeak 3 events
export const tsEventEmitter = new EventEmitter<{
  clientconnect: [ClientConnect];
  clientdisconnect: [ClientDisconnect];
  clientmoved: [ClientMoved];
}>();
