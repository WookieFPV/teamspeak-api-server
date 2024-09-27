import {Hono} from 'hono'
import {apiTsUsers} from "./api/ts/users";
import {apiSleep} from "./api/demo/sleep.ts";
import {apiTsUserById} from "./api/ts/userById.ts";
import {apiKickTsUser} from "./api/ts/kickTsUser.ts";

const app = new Hono().basePath('/api')

app.get('/ts/users', apiTsUsers)

app.get('/ts/user/:id', c => apiTsUserById(c))

app.get('/ts/kickUser/:name', c => apiKickTsUser(c))


app.get('/sleep/:time', (c) => apiSleep(c, c.req.param('time')))

app.get('/sleep', (c) => apiSleep(c, undefined))


export default app
