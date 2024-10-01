import {Hono} from 'hono'
import {apiSleep} from "./api/demo/sleep.ts";
import {apiTsUsersKick} from "./api/ts/users/kick.ts";
import {apiTsChannels} from "./api/ts/channels/root.ts";
import {apiTsUsersById} from "./api/ts/users/ById.ts";
import {apiTsUsersPoke} from "./api/ts/users/poke.ts";
import {apiTsUsers} from "~/api/ts/users/root.ts";

const app = new Hono().basePath('/api')

app.get('/ts/channels', apiTsChannels)

app.get('/ts/users', apiTsUsers)

app.get('/ts/users/:name', apiTsUsersById)

app.delete('/ts/users/:name/kick', apiTsUsersKick)

app.post('/ts/users/:name/poke', apiTsUsersPoke)

app.get('/sleep/:time', (c) => apiSleep(c, c.req.param('time')))

app.get('/sleep', (c) => apiSleep(c, "1000"))


export default app
