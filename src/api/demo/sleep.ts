import {sleep} from "bun";
import {Context} from "hono";


export const apiSleep = async (c: Context, time: string | undefined) => {
    const timeParam = c.req.param('time')
    if (!timeParam && time) return c.text("time not set", {status: 400})

    const timeInt = parseInt(time ?? "1000")
    if (isNaN(timeInt)) return c.text("time is not a number", {status: 400})

    await sleep(timeInt);
    return c.text(`Slept for ${timeInt}ms`);
}
