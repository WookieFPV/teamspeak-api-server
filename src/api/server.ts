import {serve} from "bun";
import {apiTsUsers} from "./ts/users.ts";
import {apiSleep} from "./demo/sleep.ts";
import {apiTsUserById} from "./ts/userById.ts";
import {apiKickTsUser,} from "./ts/kickTsUser.ts";


export const startServer = ({port = 8080}: { port: number }) => {
    console.log(`Server started on http://localhost:${port}`);
    return serve({
        port,
        async fetch(req) {

            const url = new URL(req.url);
            console.log(url.searchParams.get("name"))
            console.log(`### [URL]: ${url.pathname}|${url.search} size:${url.searchParams.size}`);
            if (url.pathname === "/api/ts/users") return apiTsUsers(url)
            if (url.pathname === "/api/ts/user/*") return apiTsUserById(url)
            if (url.pathname === "/api/ts/kickUser") return apiKickTsUser(url)
            if (url.pathname === "/api/sleep") return apiSleep(url)
            return new Response("404!");
        },
    });

}

