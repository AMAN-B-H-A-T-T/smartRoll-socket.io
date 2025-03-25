import { Socket, type Server } from "socket.io";
import {
  AUTHENTICATION,
  DJANGOCLIENT,
  ERROR,
  FECLIENT,
  ONGOING_SESSION_DATA,
  SESSION_DATA,
  SESSION_ENDED,
  SUCCESS_STATUS_CODE,
} from "../index.constant";
import type SocketIo from "../utilities/clientSocket";
import type ServerSocket from "../utilities/djangoSocket";
import type { IEventData, IEventMessage } from "../index.types";
import ServerSocketService from "./djangoSocket.services";
import type ClinetSocket from "../utilities/clientSocket";
import ClientSocketServices from "./clientSocket.services";

class CommunicationService {
  serverSocket!: ServerSocket;
  clientSocket!: SocketIo;
  io!: Server;

  constructor(
    serverSocket: ServerSocket,
    clientSocket: ClinetSocket,
    io: Server
  ) {
    //set the reference of the server socket class
    this.serverSocket = serverSocket;
    //set the refrence of the the client socket clas
    this.clientSocket = clientSocket;
    //set the refrence of io server
    this.io = io;
  }

  /**
   * @param session_id
   * @description get the client socket instance from sessionMaps
   * @returns clinet socket instance
   */
  getSocketClientInstance(session_id: string): Socket | null {
    if (!this.clientSocket.sessionMpas[session_id]) {
      return null;
    }
    return this.clientSocket.sessionMpas[session_id];
  }

  /**
   * @param session_id
   * @description remove the session data from the sessionMap
   */
  removeClientSocketFromMap(session_id: string) {
    if (this.clientSocket.sessionMpas[session_id]) {
      delete this.clientSocket.sessionMpas[session_id];
    }
  }

  /**
   * @param sessionId
   * @param authToken
   * @description authenticate the teacher before joinning to session room
   */
  validateTeacher(sessionId: string, authToken: string) {
    try {
      const payload = {
        session_id: sessionId,
        auth_token: authToken,
      };
      ServerSocketService.sendMessage(
        AUTHENTICATION,
        DJANGOCLIENT,
        SUCCESS_STATUS_CODE,
        payload,
        this.serverSocket.socketInstance,
        "req"
      );
    } catch (error: any) {
      console.log(`Error at : validateTeacher - ${error.message}`);
    }
  }

  /**
   * @event authentication (client - DJANGO)
   * @param message
   * @description handle the AUTHENTICATION event trigger from the client - DJANGO
   */
  authenticationHandler(messageEvent: IEventMessage) {
    try {
      const { status_code, data } = messageEvent;
      const { session_id, status, message, auth_token } = data as IEventData;
      // let socket: Socket | null = this.getSocketClientInstance(session_id);
      if (status_code === 500 && status === false) {
        console.log("authentication error");
        ClientSocketServices.sendErrorMessageToRoom(
          message as string,
          session_id,
          this.clientSocket.clientNameSpace,
          401
        );
        return ClientSocketServices.disconnectClinet(
          this.clientSocket.clientNameSpace,
          session_id
        );
        // return socket?.disconnect(true);
      }
      // socket?.join(session_id);
      const responseObj = {
        session_id: session_id,
        auth_token: auth_token,
      };

      ServerSocketService.sendMessage(
        ONGOING_SESSION_DATA,
        DJANGOCLIENT,
        SUCCESS_STATUS_CODE,
        responseObj,
        this.serverSocket.socketInstance,
        "req"
      );
    } catch (error: any) {
      console.log(
        `Error at AuthenticationHandler(client -DJANGO) - ${error.messaege}`
      );
    }
  }

  /**
   * @event on_going_session_data
   * @param message
   * @description get and send the data of onGoing session (in-case of the reload or reconnection of the socket coneectio)
   */
  onGoingSessionDataHandler(messageEvent: IEventMessage) {
    try {
      const { status_code, data } = messageEvent;
      const { session_id, status, message } = data as IEventData;
      // let socket: Socket | null = this.getSocketClientInstance(session_id);
      if (status_code !== 200 && status === false) {
        ClientSocketServices.sendErrorMessageToRoom(
          message as string,
          session_id,
          this.clientSocket.clientNameSpace,
          500
        );
      }

      ClientSocketServices.sendaMessageToClient(
        ONGOING_SESSION_DATA,
        SUCCESS_STATUS_CODE,
        data,
        this.clientSocket.clientNameSpace,
        session_id
      );
    } catch (error: any) {
      console.log(
        `Error At onGoingSessionDataHandler(client = DJANGO) - ${error.message}`
      );
    }
  }

  /**
   * @event mark_attendance
   * @param messageEvent
   * @description get the details of the stundet  whose the attendace is marked
   */
  sessionDataHandler(messageEvent: IEventMessage) {
    try {
      const { data } = messageEvent;
      const { session_id, data: studentData } = data as IEventData;
      console.log(studentData);
      ClientSocketServices.sendaMessageToClient(
        SESSION_DATA,
        SUCCESS_STATUS_CODE,
        studentData,
        this.clientSocket.clientNameSpace,
        session_id
      );
    } catch (error: any) {
      console.log(
        `Error At sessionDataHandler(client = DJANGO) - ${error.message}`
      );
    }
  }

  /**
   * @event session_ended (client-FE)
   * @param sessionId
   * @param authToken
   * @description transfer the request of the session end to server
   */
  sessionEndedHandler(sessionId: string, authToken: string) {
    try {
      const payload = {
        data: {
          sessionId,
          authToken,
        },
      };

      ServerSocketService.sendMessage(
        SESSION_ENDED,
        DJANGOCLIENT,
        SUCCESS_STATUS_CODE,
        payload,
        this.serverSocket.socketInstance,
        "req"
      );
    } catch (error: any) {
      console.log(
        `Error At sessionEndedHandler(client = FE) - ${error.messaege}`
      );
    }
  }

  /**
   * @event session_ended (client-Django)
   * @param message
   * @description server response on the session_ended event
   */
  serverSessionEndedHandler(message: string) {
    try {
      const { data, status_code } = JSON.parse(message) as IEventMessage;
      const { message: errorMessage, session_id } = data as IEventData;
      //todo: remove the socket instance from the sessionMaps
      // const socket: Socket | null = this.getSocketClientInstance(session_id);
      if (status_code === 500) {
        return ClientSocketServices.sendErrorMessageToRoom(
          errorMessage as string,
          session_id,
          this.clientSocket.clientNameSpace,
          500
        );
      }
      //todo: call the clinet session_ended event to close the seesion and disconnect the connection
      ClientSocketServices.sendaMessageToClient(
        SESSION_ENDED,
        SUCCESS_STATUS_CODE,
        data,
        this.clientSocket.clientNameSpace,
        session_id
      );

      // remove the socket object from map
      // if (this.clientSocket.sessionMpas[session_id]) {
      //   delete this.clientSocket.sessionMpas[session_id];
      // }
      // close the connection
      return ClientSocketServices.disconnectClinet(
        this.clientSocket.clientNameSpace,
        session_id
      );
      // return socket?.disconnect(true);
    } catch (error: any) {
      console.log(
        `Error AT serverSessionEndedHandler(client = DJANOG) - ${error.message}`
      );
    }
  }

  /**
   * @description handle the disconnection from the server side
   */
  handleServerSocketDisconnection() {
    try {
      //todo: false the connection_status
      this.serverSocket.setConnectionStatus(false);
      //todo: iterate over all the availabe sockets map using the session_id
      //todo: send the error message to client that server is disconneted
      this.clientSocket.clientNameSpace.emit(ERROR, {
        event: ERROR,
        client: FECLIENT,
        status_code: 502,
        data: "server connection loose",
      });
      ClientSocketServices.disconnectAllActiveClient(
        this.clientSocket.clientNameSpace
      );
      //todo: delete the socket sessionMaps
      this.clientSocket.cleanUpSessionMap();
    } catch (error: any) {
      console.log(
        `Error At handleServerSocketDisconnection(client = DJANGO) - ${error.message}`
      );
    }
  }
}
export default CommunicationService;
