import { Server } from "socket.io";

import CommunicationService from "./services/communication.services";
import ServerSocket from "./utilities/djangoSocket";
import ClientSocket from "./utilities/clientSocket";

import UnixSocketClient from "./utilities/unixSocket";
import { PORT, UNIX_SOCKET_URL } from "./configuration/env.config";

const io = new Server(PORT, {
  //   cors: { origin: "*" },
});
const serverSocket = new ServerSocket(io);
const clientSocket = new ClientSocket(io, serverSocket);
const unixScoket = new UnixSocketClient(UNIX_SOCKET_URL);
const communicationService = new CommunicationService(
  serverSocket,
  clientSocket,
  io,
  unixScoket
);
globalThis.bunSocket = communicationService;

console.log("server is listing of the 3000");
