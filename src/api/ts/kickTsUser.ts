import {getTeamspeakInstance} from "../../teamspeak/ts3.ts";
import {ReasonIdentifier} from "ts3-nodejs-library";
import {Context} from "hono";

export const apiKickTsUser = async (c: Context) => {
    const ts = await getTeamspeakInstance();
    const clientName = c.req.param('name')
    if (!clientName) return new Response("name missing in link", {status: 400});

    const [client] = await ts.clientFind(clientName)
    if (!client) return new Response(undefined, {status: 404});

    try {
        await ts.clientKick(client.clid, ReasonIdentifier.KICK_SERVER, "lol", false)
        return new Response("kicked", {status: 200});
    } catch (e) {
        return new Response(undefined, {status: 404});
    }
}
