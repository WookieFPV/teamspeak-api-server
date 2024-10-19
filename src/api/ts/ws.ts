import { stringifyWsEvent } from '~/teamspeak/WsEvent.ts';
import { getTeamspeakInstance } from '~/teamspeak/ts3.ts';
import { upgradeWebSocket } from '~/websocket.ts';

/**
 * EXPERIMENTAL (not 100% stable over time)
 * The WebSocket server is used to listen to events from the TeamSpeak server.
 */
export const apiTsWs = upgradeWebSocket((_) => {
  return {
    onMessage(msg) {
      console.log('onMSg: ', msg.data);
    },
    async onOpen(_, ws) {
      console.log('onOpen');
      ws.raw?.send(stringifyWsEvent({ type: 'connected' }));
      const ts = await getTeamspeakInstance();

      ts.on('clientconnect', (e) => {
        console.log(`clientconnect: ${e.client.nickname}`);
        if (!ws.raw) console.log(`!ws.raw : ${JSON.stringify(ws)}`);
        ws.raw?.send(stringifyWsEvent({ type: 'clientConnect', e }));
      });
      ts.on('clientdisconnect', (e) => {
        console.log(
          `clientdisconnect: ${e.client?.nickname ?? e.client?.clid ?? e.client?.cid}`,
        );
        if (!ws.raw) console.log(`!ws.raw : ${JSON.stringify(ws)}`);
        ws.raw?.send(stringifyWsEvent({ type: 'clientDisconnect', e }));
      });
      ts.on('clientmoved', (e) => {
        console.log(
          `clientmoved: ${e.client?.nickname ?? e.client?.clid ?? e.client?.cid}`,
        );
        if (!ws.raw) console.log(`!ws.raw : ${JSON.stringify(ws)}`);
        ws.raw?.send(stringifyWsEvent({ type: 'clientMoved', e }));
      });
    },
    onClose(_, _ws) {
      console.log('WebSocket server closed');
    },
    onError(err, _ws) {
      console.log(`WebSocket server error: ${err}`);
      console.error(err);
    },
  };
});
