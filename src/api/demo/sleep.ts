import { sleep } from 'bun';
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';

export const apiSleep = async (c: Context, time: string) => {
  const timeInt = Number.parseInt(time, 10);
  if (Number.isNaN(timeInt))
    throw new HTTPException(400, { message: 'time is not a number' });

  await sleep(timeInt);
  return c.text(`Slept for ${timeInt}ms`);
};
