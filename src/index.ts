import { Server } from "socket.io";

import CommunicationService from "./services/communication.services";
import ClientSocket from "./utilities/clientSocket";

import UnixSocketClient from "./utilities/unixSocket";
import { PORT, UNIX_SOCKET_URL } from "./configuration/env.config";
const worker = new Worker(new URL("./worker.ts", import.meta.url));
const io = new Server(PORT, {
  //   cors: { origin: "*" },
});
// const unixScoket = new UnixSocketClient(UNIX_SOCKET_URL);
const clientSocket = new ClientSocket(io, worker);
const communicationService = new CommunicationService(clientSocket, worker, io);
globalThis.bunSocket = communicationService;

worker.postMessage({ type: "connect", data: { path: UNIX_SOCKET_URL } });
console.log(`server is listing of the ${PORT}`);

console.log("Main thread PID:", process.pid);

// Stop the worker gracefully on exit
process.on("exit", () => {
  console.log("Main thread exiting. Terminating worker...");
  worker.terminate();
});
