import {getTeamspeakInstance} from "../../teamspeak/ts3.ts";
import {Context} from "hono";

export const apiTsUserById = async (c: Context) => {
    const ts = await getTeamspeakInstance();
    const clientId = c.req.param('id')
    if (!clientId) return new Response("id missing in link", {status: 400});

    const client = await ts.getClientById(clientId);
    if (!client) return new Response(undefined, {status: 404});

    return new Response(JSON.stringify(client));
}
