import {z} from "zod";

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).optional(),
    TS3_HOST: z.string(),
    TS3_PASSWORD: z.string(),
    TS3_NICKNAME: z.string().optional(),
    TS3_USERNAME: z.string(),
    TS3_USER_CID: z.string().optional(),
    API_SECRET: z.string(),
}).catch((e) => {
    console.log("Missing env vars!")
    console.log(e.error);
    throw e
})


export const env = envSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
    TS3_HOST: process.env.TS3_HOST,
    TS3_PASSWORD: process.env.TS3_PASSWORD,
    TS3_NICKNAME: process.env.TS3_NICKNAME,
    TS3_USERNAME: process.env.TS3_USERNAME,
    TS3_USER_CID: process.env.TS3_USER_CID,
    API_SECRET: process.env.API_SECRET,
})
