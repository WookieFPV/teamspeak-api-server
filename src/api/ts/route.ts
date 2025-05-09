import { Hono } from 'hono';
import { middlewareAuth } from '~/api/middlewareAuth.ts';
import { apiTsWs } from '~/api/ts/apiTsWs.ts';
import { apiTsChannels } from '~/api/ts/channels/root.ts';
import { apiTsUsersById } from '~/api/ts/users/ById.ts';
import { apiTsUsersKick } from '~/api/ts/users/kick.ts';
import { apiTsUsersPoke } from '~/api/ts/users/poke.ts';
import { apiTsUsers } from '~/api/ts/users/root.ts';

export const honoRouteTs = new Hono();

honoRouteTs.use('/*', middlewareAuth);

honoRouteTs.get('/channels', apiTsChannels);

honoRouteTs.get('/users', apiTsUsers);

honoRouteTs.get('/users/:name', apiTsUsersById);

honoRouteTs.delete('/users/:name/kick', apiTsUsersKick);

honoRouteTs.post('/users/:name/poke', apiTsUsersPoke);

honoRouteTs.get('/ws', apiTsWs);
