import {Hono} from "hono";
import {bearerAuth} from "hono/bearer-auth";
import {env} from "~/env.ts";
import {apiTsChannels} from "~/api/ts/channels/root.ts";
import {apiTsUsers} from "~/api/ts/users/root.ts";
import {apiTsUsersById} from "~/api/ts/users/ById.ts";
import {apiTsUsersKick} from "~/api/ts/users/kick.ts";
import {apiTsUsersPoke} from "~/api/ts/users/poke.ts";
import {apiTsWs} from "~/api/ts/ws.ts";

export const honoRouteTs = new Hono().basePath('/ts')

honoRouteTs.use('/*', bearerAuth({token: env.API_SECRET}))

honoRouteTs.get('/channels', apiTsChannels)

honoRouteTs.get('/users', apiTsUsers)

honoRouteTs.get('/users/:name', apiTsUsersById)

honoRouteTs.delete('/users/:name/kick', apiTsUsersKick)

honoRouteTs.post('/users/:name/poke', apiTsUsersPoke)

honoRouteTs.get('/ws2', apiTsWs)
