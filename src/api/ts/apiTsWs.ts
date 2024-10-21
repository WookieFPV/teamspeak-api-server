import { randomUUID } from 'node:crypto';
import {
  type ClientConnect,
  type ClientDisconnect,
  type ClientMoved,
  stringifyWsEvent,
} from '~/teamspeak/WsEvent.ts';
import { getTeamspeakInstance } from '~/teamspeak/ts3.ts';
import { tsEventEmitter } from '~/teamspeak/tsEventEmitter.ts';
import { upgradeWebSocket } from '~/websocket.ts';

type Listener<T> = (event: T) => void;
type WsListener = {
  clientconnect: Listener<ClientConnect> | null;
  clientdisconnect: Listener<ClientDisconnect> | null;
  clientmoved: Listener<ClientMoved> | null;
  connectionDate: number;
  connectionId: string;
};

/**
 * The WebSocket server is used to listen to events from the TeamSpeak server.
 */
export const apiTsWs = upgradeWebSocket((_) => {
  // Create an object to store the listener functions
  const listeners: WsListener = {
    clientconnect: null,
    clientdisconnect: null,
    clientmoved: null,
    connectionDate: Date.now(),
    connectionId: '',
  };
  const getListenerCount = () => tsEventEmitter.listenerCount('clientconnect');
  return {
    onMessage(msg) {
      console.log('[WS] [${listeners.connectionId}] onMSg: ', msg.data);
    },
    async onOpen(_, ws) {
      listeners.connectionDate = Date.now();
      listeners.connectionId = randomUUID();

      console.log(
        `[WS] [${listeners.connectionId}] onOpen (connections: ${getListenerCount() + 1})`,
      );
      await getTeamspeakInstance();
      ws.send(stringifyWsEvent({ type: 'connected' }));

      listeners.clientconnect = (e) => {
        ws.send(stringifyWsEvent({ type: 'clientConnect', e }));
      };
      tsEventEmitter.on('clientconnect', listeners.clientconnect);

      listeners.clientdisconnect = (e) => {
        ws.send(stringifyWsEvent({ type: 'clientDisconnect', e }));
      };
      tsEventEmitter.on('clientdisconnect', listeners.clientdisconnect);

      listeners.clientmoved = (e) => {
        ws.send(stringifyWsEvent({ type: 'clientMoved', e }));
      };
      tsEventEmitter.on('clientmoved', listeners.clientmoved);
    },
    onClose(_, _ws) {
      console.log(
        `[WS] [${listeners.connectionId}] closed, duration: ${printTimeDiff(listeners.connectionDate)} (connections: ${getListenerCount() - 1})`,
      );
      // Remove all listeners
      if (listeners.clientconnect)
        tsEventEmitter.off('clientconnect', listeners.clientconnect);
      if (listeners.clientdisconnect)
        tsEventEmitter.off('clientdisconnect', listeners.clientdisconnect);
      if (listeners.clientmoved)
        tsEventEmitter.off('clientmoved', listeners.clientmoved);
    },
    onError(err, _ws) {
      console.log(`[WS] [${listeners.connectionId}] server error: ${err}`);
      console.error(err);
    },
  };
});

const printTimeDiff = (start: number) => {
  return `${Math.round((Date.now() - start) / 1000)}s`;
};
