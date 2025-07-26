require("dotenv").config();

const env = process.env;

export const PORT = Number(env.PORT || 8000);
export const SERVER_WS_URL = env.DJANGO_WS_URL;
export const UNIX_SOCKET_URL: string = env.UNIX_SOCKET_FILE_PPATH as string;
export const RECONNECTION_TIMEOUT = Number(env.RECONNECTION_TIMEOUT);
export const HEALTHCHECK_INTERVAL = Number(env.HEALTHCHECK_INTERVAL);
