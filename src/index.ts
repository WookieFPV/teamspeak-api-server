import {Hono} from 'hono'
import {apiSleep} from "./api/demo/sleep.ts";
import {apiTsUsersKick} from "./api/ts/users/kick.ts";
import {apiTsChannels} from "./api/ts/channels/root.ts";
import {apiTsUsersById} from "./api/ts/users/ById.ts";
import {apiTsUsersPoke} from "./api/ts/users/poke.ts";
import {apiTsUsers} from "~/api/ts/users/root.ts";
import type {JwtVariables} from 'hono/jwt'
import {bearerAuth} from 'hono/bearer-auth'
import {env} from "~/env.ts";
import {getConnInfo, serveStatic} from "hono/bun";

// this is against the Best Practices, but I will keep it this way for now: https://hono.dev/docs/guides/best-practices#don-t-make-controllers-when-possible
const app = new Hono<{ Variables: JwtVariables }>().basePath('/api')

app.use('/ts/*', bearerAuth({
    token: env.API_SECRET,
    invalidAuthenticationHeaderMessage: "Invalid invalidAuthenticationHeaderMessage",
}))

app.get('/ts/channels2', c => c.json({channels: []}))

app.get('/ts/channels', apiTsChannels)

app.get('/ts/users', apiTsUsers)

app.get('/ts/users/:name', apiTsUsersById)

app.delete('/ts/users/:name/kick', apiTsUsersKick)

app.post('/ts/users/:name/poke', apiTsUsersPoke)

app.get('/sleep/:time', (c) => apiSleep(c, c.req.param('time')))

app.get('/sleep', (c) => apiSleep(c, "1000"))

app.use('/wookie', serveStatic({path: 'src/api/demo/wookie.jpg'}))

app.get('/debug', (c) => {
    const info = getConnInfo(c)
    return c.json(info)
})

export default {
    port: 3000,
    fetch: app.fetch,
    tls: {
        cert: Bun.file("./.ssl/fullchain.pem"),
        key: Bun.file("./.ssl/privkey.pem"),
    }
}
