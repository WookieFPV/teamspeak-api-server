import {TeamSpeakClient} from "ts3-nodejs-library/lib/node/Client";
import {TeamSpeakChannel} from "ts3-nodejs-library/lib/node/Channel.ts";

type TsWsEvent = {
    type: "clientConnect",
    e: ClientConnect
} | {
    type: "clientDisconnect"
    e: ClientDisconnect
} | {
    type: "clientMoved",
    e: ClientMoved
} | {
    type: "connected"
}
export const stringifyWsEvent = (wsEvent: TsWsEvent): string => JSON.stringify(wsEvent)

export interface ClientConnect {
    client: TeamSpeakClient;
}

export interface ClientDisconnect {
    client?: TeamSpeakClient;
    event: {
        cfid: string;
        ctid: string;
        reasonid: string;
        reasonmsg: string;
        clid: string;
        invokerid?: string;
        invokername?: string;
        invokeruid?: string;
        bantime?: number;
    };
}

export interface ClientMoved {
    client: TeamSpeakClient
    channel: TeamSpeakChannel
    reasonid: string
}
