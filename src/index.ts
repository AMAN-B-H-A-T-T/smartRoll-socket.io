import { Server } from "socket.io";
import "dotenv/config";
import CommunicationService from "./services/communication.services";
import ServerSocket from "./utilities/djangoSocket";
import ClientSocket from "./utilities/clientSocket";

import App from "./app";

const PORT = process.env.PORT || 3000;
const io = new Server(Number(PORT), {
  //   cors: { origin: "*" },
});
const serverSocket = new ServerSocket(io);
const clientSocket = new ClientSocket(io, serverSocket);

const communicationService = new CommunicationService(
  serverSocket,
  clientSocket,
  io
);
globalThis.bunSocket = communicationService;

// new App();

console.log("server is listing of the 3000");
