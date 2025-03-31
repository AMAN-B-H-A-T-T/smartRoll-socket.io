import type { Namespace, Server, Socket } from "socket.io";
import { CONNECTION } from "../index.constant";
import ServerSocketController from "../controller/djangoSocket.controller";

class ServerSocket {
  connection_state: boolean = false;
  serverIoInstance!: Server;
  socketInstance!: Socket;
  serverSocketNamespace!: Namespace;
  serverReconnectionTimeLimit: any = null;

  constructor(io: Server) {
    this.serverIoInstance = io;
    this.serverSocketNamespace = this.serverIoInstance.of("/server");
    this.setupEvent();
  }

  private setupEvent() {
    this.serverSocketNamespace.on(CONNECTION, (socket: Socket) => {
      try {
        console.log("connection");
        this.clearServerDisconnectionTimeOut();
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
  setServerReconnectionTimeLimit(timeOut: any) {
    this.serverReconnectionTimeLimit = timeOut;
  }
  getServerReconnectionTimeLimit() {
    return this.serverReconnectionTimeLimit;
  }

  clearServerDisconnectionTimeOut() {
    if (this.getServerReconnectionTimeLimit()) {
      clearInterval(this.serverReconnectionTimeLimit);
    }
  }
  handleServerDisconnectionTimeOut() {
    this.setConnectionStatus(false);
    const timeOut = setTimeout(() => {
      globalThis.bunSocket.handleServerSocketDisconnection();
    }, 600000);
    this.setServerReconnectionTimeLimit(timeOut);
  }
}

export default ServerSocket;
