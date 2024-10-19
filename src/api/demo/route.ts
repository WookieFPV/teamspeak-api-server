import { Hono } from 'hono';
import { apiDemoDebug } from '~/api/demo/debug.ts';
import { apiDemoSleep, apiDemoSleepTime } from '~/api/demo/sleep.ts';
import { apiDemoWookie } from '~/api/demo/wookie.ts';
import { apiTsWs } from '~/api/ts/ws.ts';
import { stringifyWsEvent } from '~/teamspeak/WsEvent.ts';
import { getTeamspeakInstance } from '~/teamspeak/ts3.ts';
import { upgradeWebSocket } from '~/websocket.ts';

export const honoRouteDemo = new Hono();

honoRouteDemo.get('/sleep/:time', apiDemoSleepTime);

honoRouteDemo.get('/sleep', apiDemoSleep);

honoRouteDemo.get('/wookie', apiDemoWookie);

honoRouteDemo.get('/debug', apiDemoDebug);

honoRouteDemo.get(
  '/ws2',
  upgradeWebSocket((_) => {
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
  }),
);

honoRouteDemo.get('/ws', apiTsWs);
