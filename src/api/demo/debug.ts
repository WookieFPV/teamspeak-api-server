import type { Context } from 'hono';
import { getConnInfo } from 'hono/bun';

const bootDate = new Date();

export const apiDemoDebug = async (c: Context) => {
  const info = getConnInfo(c);
  return c.json({ ...info, bootDate });
};
