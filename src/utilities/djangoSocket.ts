import type { Namespace, Server, Socket } from "socket.io";
import { CONNECTION } from "../index.constant";
import ServerSocketController from "../controller/djangoSocket.controller";

class ServerSocket {
  connection_state: boolean = false;
  serverIoInstance!: Server;
  socketInstance!: Socket;
  serverSocketNamespace!: Namespace;

  constructor(io: Server) {
    this.serverIoInstance = io;
    this.serverSocketNamespace = this.serverIoInstance.of("/server");
    this.setupEvent();
  }

  private setupEvent() {
    this.serverSocketNamespace.on(CONNECTION, (socket: Socket) => {
      try {
        console.log("connection");
        this.socketInstance = socket;
        new ServerSocketController(socket, this);
      } catch (error: any) {
        socket.disconnect(true);
        console.log(error.message);
      }
    });
  }

  getConnectionStatus(): boolean {
    return this.connection_state;
  }

  setConnectionStatus(val: boolean) {
    this.connection_state = val;
  }
}

export default ServerSocket;
