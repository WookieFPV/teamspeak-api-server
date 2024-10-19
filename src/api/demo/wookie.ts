import {serveStatic} from "hono/bun";

export const apiDemoWookie = serveStatic({path: 'assets/wookie.jpg'})
