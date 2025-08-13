import type { Namespace, Server, Socket } from "socket.io";
import * as consts from "../index.constant";
import ClientSocketServices from "../services/clientSocket.services";
import type { IEventData } from "../index.types";
import SocketIoServices from "../controller/socketIo.controller";

class ClientSocket {
  public io!: Server;
  public sessionMaps: Record<string, Socket> = {};
  public worker!: Worker;
  public clientNameSpace!: Namespace;
  private isServerConnected = false;

  constructor(io: Server, worker: any) {
    this.io = io;
    this.clientNameSpace = this.io.of("/client");
    this.worker = worker;
    this.setUpSocket();
    this.setUpWorker();
  }

  setUpSocket() {
    this.clientNameSpace.on(consts.CONNECTION, (socket: Socket) => {
      try {
        if (!this.getIsServerConnected()) {
          ClientSocketServices.sendErrorMessageToClient(
            "Server is not connected yet, please try after sometime",
            socket,
            500
          );
          return socket.disconnect(true);
        }

        const socketService: SocketIoServices = new SocketIoServices(
          socket,
          this.sessionMaps
        );

        socket.on(consts.SOCKET_CONNECTION, async (message) => {
          const { session_id, auth_token, isReConnect } = message as IEventData;
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

          if (isReConnect) {
            console.log(`reconnect: ${isReConnect} ; session: ${session_id}`);
            await ClientSocketServices.removeClientsFromRoom(
              this.clientNameSpace,
              session_id
            );
          }

          const clientCount: number = (await this.getAllClientsConnectedCount(
            session_id
          )) as number;
          console.log("clinetCount:", clientCount);

          if (clientCount >= 1) {
            ClientSocketServices.sendErrorMessageToClient(
              "Only one teacher can be connected to a lecture session at a time. Another teacher is already present.",
              socket,
              409
            );
            return;
          }

          socketService.onOpenEventHandler(session_id, auth_token);
        });

        socket.on(consts.AUDIO_PROCESSING, (messageData) => {
          socketService.handleAudioProcessingEvent(messageData);
        });

        socket.on(consts.SESSION_ENDED, (message: string) => {
          socketService.handleClientSessionEnded(message);
        });

        socket.on(consts.UPDATE_ATTENDACE, (message) => {
          socketService.handelSuspeciousStudentAttendaceMarking(message);
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

        socket.on(consts.REGULARIZATION_REQUEST, (message: any) => {
          socketService.regularizationAttendanceHandler(message);
        });

        socket.on(consts.NETWORK_EVENT, (message: any) => {
          socketService.handleNetworkEvent(message);
        });
      } catch (error) {
        socket.disconnect(true);
      }
    });
  }

  private setUpWorker() {
    if (!this.worker) return;

    this.worker.onmessage = (event: MessageEvent) => {
      const { data } = event;
      const { type, data: serverData } = data;
      switch (type) {
        case consts.SERVER_CONNECTED:
          this.setIsServerConnected(true);
          console.info(
            `connected to server (Main-Tread) at time - ${new Date().getTime()}`
          );
          break;
        case consts.SERVER_DISCONNECTED:
          return globalThis.bunSocket.handleServerSocketDisconnection();
        case consts.AUTHENTICATION:
          return globalThis.bunSocket.authenticationHandler(serverData);
        case consts.ONGOING_SESSION_DATA:
          return globalThis.bunSocket.onGoingSessionDataHandler(serverData);
        case consts.SESSION_DATA:
          return globalThis.bunSocket.sessionDataHandler(serverData);
        case consts.SESSION_ENDED:
          return globalThis.bunSocket.serverSessionEndEvent(serverData);
        case consts.REGULARIZATION_REQUEST:
          return globalThis.bunSocket.serverRegularizationEventHandler(
            serverData
          );
        case consts.REQUEST_APPROVED:
          return globalThis.bunSocket.serverRegularizationEventApprovedHandler(
            serverData
          );
        case consts.SESSION_TIMEOUT_EVENT:
          return globalThis.bunSocket.ServerSessionTimeOutEventHandler(
            serverData
          );
        case consts.UPDATE_ATTENDACE:
          return globalThis.bunSocket.serverStudentUpdateAttendanceMarkingApprove(
            serverData
          );
        case consts.AUDIO_PROCESSING: // acknowledgement for incoming audio
          const bunSock: any = (globalThis as any).bunSocket;
          if (bunSock && bunSock.serverAudioProcessingAck) {
            return bunSock.serverAudioProcessingAck(serverData);
          }
          return;

        // Heart-beat ACK from the server
        case "pong":
          // We could toggle a heartbeat flag here; for now just log.
          console.info("Heartbeat pong received from server");
          return;
      }
    };
  }

  private setIsServerConnected(val: boolean) {
    this.isServerConnected = val;
  }

  cleanUpSessionMap() {
    this.sessionMaps = {};
  }

  async getAllClientsConnectedCount(session_id: string) {
    try {
      const clientCount = await this.clientNameSpace
        .in(session_id)
        .allSockets();
      return clientCount.size;
    } catch (error: any) {
      console.log(`Error at getAllClientsConnectedCount: ${error.message}`);
    }
  }

  public getIsServerConnected() {
    return this.isServerConnected;
  }
}

export default ClientSocket;
