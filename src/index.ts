import {Hono} from 'hono'
import type {JwtVariables} from 'hono/jwt'
import {websocket} from "~/websocket.ts";
import {honoRouteTs} from "~/api/ts/route.ts";
import {honoRouteDemo} from "~/api/demo/route.ts";

const api = new Hono<{ Variables: JwtVariables }>().basePath('/api')

api.route("/", honoRouteTs)
api.route("/", honoRouteDemo)

const useTls = true

export default {
    port: 3000,
    fetch: api.fetch,
    websocket,
    tls: useTls ? {
        cert: Bun.file("./.ssl/fullchain.pem"),
        key: Bun.file("./.ssl/privkey.pem"),
    } : undefined,
}

