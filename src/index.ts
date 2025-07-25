import { Server } from "socket.io";

import CommunicationService from "./services/communication.services";
import ClientSocket from "./utilities/clientSocket";

import UnixSocketClient from "./utilities/unixSocket";
import { PORT, UNIX_SOCKET_URL } from "./configuration/env.config";
const io = new Server(PORT, {
  //   cors: { origin: "*" },
});
const unixScoket = new UnixSocketClient(UNIX_SOCKET_URL);
const clientSocket = new ClientSocket(io, unixScoket);
const communicationService = new CommunicationService(
  clientSocket,
  unixScoket,
  io
);
globalThis.bunSocket = communicationService;

console.log(`server is listing of the ${PORT}`);
