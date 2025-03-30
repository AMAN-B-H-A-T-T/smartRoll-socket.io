import type { Namespace, Server, Socket } from "socket.io";
import {
  CONNECTION,
  ERROR,
  REGULARIZATION_REQUEST,
  SESSION_ENDED,
  SOCKET_CONNECTION,
} from "../index.constant";
import type ServerSocket from "./djangoSocket";
import ClientSocketServices from "../services/clientSocket.services";
import type { IEventData } from "../index.types";
import SocketIoServices from "../controller/socketIo.controller";

class ClientSocket {
  io!: Server;
  sessionMaps: Record<string, Socket> = {};
  serverSocket!: ServerSocket;
  clientNameSpace!: Namespace;

  constructor(io: Server, serverConnectionStatus: ServerSocket) {
    this.io = io;
    this.clientNameSpace = this.io.of("/client");
    this.serverSocket = serverConnectionStatus;
    this.setUpSocket();
  }

  setUpSocket() {
    this.clientNameSpace.on(CONNECTION, (socket: Socket) => {
      try {
        console.log(this.serverSocket.getConnectionStatus());
        if (!this.serverSocket.getConnectionStatus()) {
          ClientSocketServices.sendErrorMessageToClient(
            "something went wrong",
            socket,
            500
          );
          return socket.disconnect(true);
        }

        const socketService: SocketIoServices = new SocketIoServices(
          socket,
          this.sessionMaps
        );

        socket.on(SOCKET_CONNECTION, (message) => {
          const { session_id, auth_token } = message as IEventData;
          // check for null , undefined and empty

          if (
            !session_id ||
            !auth_token ||
            session_id.trim() === "" ||
            auth_token.trim() === ""
          ) {
            ClientSocketServices.sendErrorMessageToClient(
              "Please provide the session id and auth_token",
              socket,
              500
            );
            return socket.disconnect(true);
          }

          socketService.onOpenEventHandler(session_id, auth_token);
        });

        socket.on(SESSION_ENDED, (message: string) => {
          socketService.handleClientSessionEnded(message);
        });
        socket.on("error", (error) => {
          console.log(error);
        });
        socket.on("disconnecting", (reason) => {
          console.log("disconnection");
          console.log(reason);
        });

        socket.on("disconnect", () => {
          socketService.onCloseEventHandler();
        });

        socket.on(REGULARIZATION_REQUEST, (message: any) => {
          socketService.regularizationAttendanceHandler(message);
        });
      } catch (error) {
        socket.disconnect(true);
      }
    });
  }

  cleanUpSessionMap() {
    this.sessionMaps = {};
  }
}

export default ClientSocket;
