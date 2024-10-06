import {TeamSpeakClient} from "ts3-nodejs-library/lib/node/Client";

type TsWsEvent = {
    type: "connect",
    e: ClientConnect
} | {
    type: "disconnect"
    e: ClientDisconnect
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
