import { sleep } from 'bun';
import type { Context } from 'hono';

export const apiDemoSleepTime = async (c: Context) =>
  apiSleep(c, c.req.param('time'));

export const apiDemoSleep = async (c: Context) => apiSleep(c, '1000');

export const apiSleep = async (c: Context, time: string) => {
  if (!time) return c.text('time not set', { status: 400 });

  const timeInt = Number.parseInt(time);
  if (Number.isNaN(timeInt))
    return c.text('time is not a number', { status: 400 });

  await sleep(timeInt);
  return c.text(`Slept for ${timeInt}ms`);
};
