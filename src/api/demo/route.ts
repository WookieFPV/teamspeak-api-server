import {Hono} from "hono";
import {apiDemoSleep, apiDemoSleepTime} from "~/api/demo/sleep.ts";
import {apiDemoWookie} from "~/api/demo/wookie.ts";
import {apiDemoDebug} from "~/api/demo/debug.ts";
import {upgradeWebSocket} from "~/websocket.ts";
import {stringifyWsEvent} from "~/teamspeak/WsEvent.ts";
import {getTeamspeakInstance} from "~/teamspeak/ts3.ts";

export const honoRouteDemo = new Hono().basePath('/demo')

honoRouteDemo.get('/sleep/:time', apiDemoSleepTime)

honoRouteDemo.get('/sleep', apiDemoSleep)

honoRouteDemo.get('/wookie', apiDemoWookie)

honoRouteDemo.get('/debug', apiDemoDebug)

honoRouteDemo.get("/ws2", upgradeWebSocket((_) => {
        return ({
            onMessage(msg) {
                console.log("onMSg: ", msg.data)
            },
            async onOpen(_, ws) {
                console.log(`onOpen`);
                ws.raw?.send(stringifyWsEvent({type: "connected"}))
                const ts = await getTeamspeakInstance()

                ts.on("clientconnect", (e) => {
                    console.log(`clientconnect: ${e.client.nickname}`)
                    if (!ws.raw) console.log(`!ws.raw : ${JSON.stringify(ws)}`)
                    ws.raw?.send(stringifyWsEvent({type: "clientConnect", e}))
                })
                ts.on("clientdisconnect", (e) => {
                    console.log(`clientdisconnect: ${e.client?.nickname ?? e.client?.clid ?? e.client?.cid}`)
                    if (!ws.raw) console.log(`!ws.raw : ${JSON.stringify(ws)}`)
                    ws.raw?.send(stringifyWsEvent({type: "clientDisconnect", e}))
                })
                ts.on("clientmoved", (e) => {
                    console.log(`clientmoved: ${e.client?.nickname ?? e.client?.clid ?? e.client?.cid}`)
                    if (!ws.raw) console.log(`!ws.raw : ${JSON.stringify(ws)}`)
                    ws.raw?.send(stringifyWsEvent({type: "clientMoved", e}))
                })
            },
            onClose(_, _ws) {
                console.log(`WebSocket server closed`);
            },
            onError(err, _ws) {
                console.log(`WebSocket server error: ${err}`);
                console.error(err);
            }
        })
    })
)

honoRouteDemo.get('/ws', upgradeWebSocket((_c) => {
    console.log("upgradeWebSocket")
    return {
        onOpen: (event, ws) => {
            console.log("jgsrhush")
            ws.send('onOpen ()')
            ws.raw?.send('onOpen () raw')
        },
        onError: (event, _ws) => {
            console.warn(`Error: `, event)
        },
        onMessage(event, ws) {
            console.log(`Message from client: ${event.data}`)
            ws.send('Hello from server!')
        },
        onClose: () => {
            console.log('Connection closed')
        },
    }
}))
