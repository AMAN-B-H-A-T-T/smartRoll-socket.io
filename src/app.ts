import "dotenv/config";
import { Server } from "socket.io";
import type { Server as ioSever } from "socket.io";
import ServerSocket from "./utilities/djangoSocket";
import ClientSocket from "./utilities/clientSocket";
import CommunicationService from "./services/communication.services";
class App {
  private PORT = process.env.PORT || 3000;
  io!: ioSever;

  constructor() {
    this.io = new Server(Number(this.PORT));
  }
  setUpControllerAndServices() {
    const serverSocket = new ServerSocket(this.io);
    const clientSocket = new ClientSocket(this.io, serverSocket);

    const communicationService = new CommunicationService(
      serverSocket,
      clientSocket,
      this.io
    );
    globalThis.bunSocket = communicationService;
  }
}

export default App;
