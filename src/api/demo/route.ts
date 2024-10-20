import { Hono } from 'hono';
import { apiDemoDebug } from '~/api/demo/debug.ts';
import { apiSleep } from '~/api/demo/sleep.ts';
import { apiDemoWookie } from '~/api/demo/wookie.ts';

export const honoRouteDemo = new Hono();

honoRouteDemo.get('/sleep/:time', (c) => apiSleep(c, c.req.param('time')));

honoRouteDemo.get('/sleep', (c) => apiSleep(c, '1000'));

honoRouteDemo.get('/wookie', apiDemoWookie);

honoRouteDemo.get('/debug', apiDemoDebug);
