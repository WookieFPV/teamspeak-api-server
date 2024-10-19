import {Hono} from 'hono'
import {apiSleep} from "./api/demo/sleep.ts";
import {apiTsUsersKick} from "./api/ts/users/kick.ts";
import {apiTsChannels} from "./api/ts/channels/root.ts";
import {apiTsUsersById} from "./api/ts/users/ById.ts";
import {apiTsUsersPoke} from "./api/ts/users/poke.ts";
import {apiTsUsers} from "~/api/ts/users/root.ts";
import type {JwtVariables} from 'hono/jwt'
import {getConnInfo, serveStatic} from "hono/bun";
import {bearerAuth} from "hono/bearer-auth";
import {env} from "~/env.ts";
import {websocket} from "~/websocket.ts";
import {apiTsWs} from "~/api/ts/ws.ts";


const bootDate = new Date();

// this is against the Best Practices, but I will keep it this way for now: https://hono.dev/docs/guides/best-practices#don-t-make-controllers-when-possible
const app = new Hono<{ Variables: JwtVariables }>().basePath('/api')

app.use('/ts/*', bearerAuth({token: env.API_SECRET}))

app.get('/ts/channels', apiTsChannels)

app.get('/ts/users', apiTsUsers)

app.get('/ts/users/:name', apiTsUsersById)

app.delete('/ts/users/:name/kick', apiTsUsersKick)

app.post('/ts/users/:name/poke', apiTsUsersPoke)

app.get('/ts/ws', apiTsWs)

app.get('/sleep/:time', (c) => apiSleep(c, c.req.param('time')))

app.get('/sleep', (c) => apiSleep(c, "1000"))

app.get('/wookie', serveStatic({path: 'src/api/demo/wookie.jpg'}))

app.get('/debug', (c) => {
    const info = getConnInfo(c)
    return c.json({...info, bootDate})
})

export default {
    port: 3000,
    fetch: app.fetch,
    websocket,
    tls: {
        cert: Bun.file("./.ssl/fullchain.pem"),
        key: Bun.file("./.ssl/privkey.pem"),
    },
}

