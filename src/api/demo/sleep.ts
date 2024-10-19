import { sleep } from 'bun';
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';

export const apiDemoSleepTime = async (c: Context) =>
  apiSleep(c, c.req.param('time'));

export const apiDemoSleep = async (c: Context) => apiSleep(c, '1000');

export const apiSleep = async (c: Context, time: string) => {
  if (!time) throw new HTTPException(400, { message: 'time not set' });

  const timeInt = Number.parseInt(time);
  if (Number.isNaN(timeInt))
    throw new HTTPException(400, { message: 'time is not a number' });

  await sleep(timeInt);
  return c.text(`Slept for ${timeInt}ms`);
};
