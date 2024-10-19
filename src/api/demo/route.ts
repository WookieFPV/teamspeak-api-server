import { Hono } from 'hono';
import { apiDemoDebug } from '~/api/demo/debug.ts';
import { apiDemoSleep, apiDemoSleepTime } from '~/api/demo/sleep.ts';
import { apiDemoWookie } from '~/api/demo/wookie.ts';

export const honoRouteDemo = new Hono();

honoRouteDemo.get('/sleep/:time', apiDemoSleepTime);

honoRouteDemo.get('/sleep', apiDemoSleep);

honoRouteDemo.get('/wookie', apiDemoWookie);

honoRouteDemo.get('/debug', apiDemoDebug);
