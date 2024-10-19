import { Hono } from 'hono';
import { middlewareAuth } from '~/api/middlewareAuth.ts';
import { apiTokenPost } from '~/api/token/createToken.ts';
import { apiTokenDelete } from '~/api/token/deleteToken.ts';
import { apiGetTokenCount } from '~/api/token/getTokenCount.ts';

export const honoRouteToken = new Hono();

honoRouteToken.use('/*', middlewareAuth);

honoRouteToken.get('*', apiGetTokenCount);

honoRouteToken.post('*', apiTokenPost);

honoRouteToken.delete('/:token', apiTokenDelete);
