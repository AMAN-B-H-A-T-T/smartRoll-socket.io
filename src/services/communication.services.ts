import { Socket, type Server } from "socket.io";
import {
  AUDIO_PROCESSING,
  AUTHENTICATION,
  DJANGOCLIENT,
  ERROR,
  FECLIENT,
  ONGOING_SESSION_DATA,
  REGULARIZATION_REQUEST,
  REQUEST_APPROVED,
  SESSION_DATA,
  SESSION_ENDED,
  SESSION_TIMEOUT_EVENT,
  SUCCESS_STATUS_CODE,
} from "../index.constant";
import type SocketIo from "../utilities/clientSocket";
import type ServerSocket from "../utilities/djangoSocket";
import type { IEventData, IEventMessage } from "../index.types";
import ServerSocketService from "./djangoSocket.services";
import type ClientSocket from "../utilities/clientSocket";
import ClientSocketServices from "./clientSocket.services";

class CommunicationService {
  serverSocket!: ServerSocket;
  clientSocket!: SocketIo;
  io!: Server;

  constructor(
    serverSocket: ServerSocket,
    clientSocket: ClientSocket,
    io: Server
  ) {
    //set the reference of the server socket class
    this.serverSocket = serverSocket;
    //set the reference of the the client socket class
    this.clientSocket = clientSocket;
    //set the reference of io server
    this.io = io;
  }

  /**
   * @param session_id
   * @description get the client socket instance from sessionMaps
   * @returns client socket instance
   */
  getSocketClientInstance(session_id: string): Socket | null {
    if (!this.clientSocket.sessionMaps[session_id]) {
      return null;
    }
    return this.clientSocket.sessionMaps[session_id];
  }

  /**
   * @param session_id
   * @description remove the session data from the sessionMap
   */
  removeClientSocketFromMap(session_id: string) {
    if (this.clientSocket.sessionMaps[session_id]) {
      delete this.clientSocket.sessionMaps[session_id];
    }
  }

  /**
   * @param sessionId
   * @param authToken
   * @description authenticate the teacher before joining to session room
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
        ClientSocketServices.sendErrorMessageToRoom(
          message as string,
          session_id,
          this.clientSocket.clientNameSpace,
          401
        );
        return ClientSocketServices.disconnectClient(
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
        `Error at AuthenticationHandler(client -DJANGO) - ${error.message}`
      );
    }
  }

  /**
   * @event on_going_session_data
   * @param message
   * @description get and send the data of onGoing session (in-case of the reload or reconnection of the socket connectio)
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

      ClientSocketServices.sendMessageToClient(
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
   * @description get the details of the student  whose the attendance is marked
   */
  sessionDataHandler(messageEvent: IEventMessage) {
    try {
      const { data } = messageEvent;
      const { session_id, data: studentData } = data as IEventData;
      ClientSocketServices.sendMessageToClient(
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
        `Error At sessionEndedHandler(client = FE) - ${error.message}`
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
      //todo: call the client session_ended event to close the session and disconnect the connection
      ClientSocketServices.sendMessageToClient(
        SESSION_ENDED,
        SUCCESS_STATUS_CODE,
        data,
        this.clientSocket.clientNameSpace,
        session_id
      );
      return ClientSocketServices.disconnectClient(
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
      //todo: iterate over all the available sockets map using the session_id
      //todo: send the error message to client that server is disconnected
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

  handleSessionEndedEvent(message: IEventData) {
    try {
      const { session_id, status, data, auth_token } = message;
      const payload = {
        session_id: session_id,
        auth_token: auth_token,
      };
      ServerSocketService.sendMessage(
        SESSION_ENDED,
        DJANGOCLIENT,
        SUCCESS_STATUS_CODE,
        data,
        this.serverSocket.socketInstance,
        "req"
      );
    } catch (error: any) {
      console.log(
        `Error At handleSessionEndedEvent(client - FE) - ${error.message}`
      );
    }
  }

  /**
   *
   * @param session_id
   * @param auth_token
   * @param data
   * @event regulization_request
   * @description handle the student manual attendance event
   */
  regularizationEventHandler(
    session_id: String,
    auth_token: string,
    data: any
  ) {
    try {
      const payload = {
        client: "DJANGo",
        session_id,
        auth_token,
        data,
      };
      ServerSocketService.sendMessage(
        REGULARIZATION_REQUEST,
        DJANGOCLIENT,
        SUCCESS_STATUS_CODE,
        payload,
        this.serverSocket.socketInstance,
        "req"
      );
    } catch (error: any) {
      `Error At regularizationEventHandler(client - FE) - ${error.message}`;
    }
  }

  /**
   * @param messageEvent
   * @event regulization_request
   */
  serverRegularizationEventHandler(messageEvent: IEventMessage) {
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

      ClientSocketServices.sendMessageToClient(
        REGULARIZATION_REQUEST,
        SUCCESS_STATUS_CODE,
        data,
        this.clientSocket.clientNameSpace,
        session_id
      );
    } catch (error: any) {
      console.log(
        `Error At serverRegularizationEventHandler(client = DJANGO) - ${error.message}`
      );
    }
  }

  /**
   * @param messageEvent
   * @event regulization_approved (client = DJANGO)
   */
  serverRegularizationEventApprovedHandler(messageEvent: IEventMessage) {
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

      ClientSocketServices.sendMessageToClient(
        REQUEST_APPROVED,
        SUCCESS_STATUS_CODE,
        data,
        this.clientSocket.clientNameSpace,
        session_id
      );
    } catch (error: any) {
      console.log(
        `Error At serverRegularizationEventHandler(client = DJANGO) - ${error.message}`
      );
    }
  }

  /**
   * @param session_id
   * @param auth_token
   * @event session_ended (client = FE)
   */
  clientSessionEndEvent(session_id: string, auth_token: string) {
    try {
      const payload = {
        session_id,
        auth_token,
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
        `Error At clientSessionEndEvent(client = FE) - ${error.message}`
      );
    }
  }

  /**
   * @param messageEvent
   * @event session_ended (client = DJANGO)
   */
  serverSessionEndEvent(messageEvent: IEventMessage) {
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

      ClientSocketServices.sendMessageToClient(
        SESSION_ENDED,
        SUCCESS_STATUS_CODE,
        data,
        this.clientSocket.clientNameSpace,
        session_id
      );

      ClientSocketServices.disconnectClient(
        this.clientSocket.clientNameSpace,
        session_id
      );
    } catch (error: any) {
      console.log(
        `Error At serverSessionEndEvent(client = DJANGOO) - ${error.message}`
      );
    }
  }

  clientAudioProcessingEventHandler(
    session_id: string,
    auth_token: string,
    blob: any,
    timestamp: string
  ) {
    try {
      const payload = {
        session_id: session_id,
        auth_token: auth_token,
        audio: blob,
        start_time: timestamp,
      };
      ServerSocketService.sendMessage(
        AUDIO_PROCESSING,
        DJANGOCLIENT,
        SUCCESS_STATUS_CODE,
        payload,
        this.serverSocket.socketInstance,
        "req"
      );
    } catch (error: any) {
      console.log(
        `Error At clinetAudioProcessingEventHandler(client = FE) - ${error.message}`
      );
    }
  }

  ServerSessionTimeOutEventHandler(message: any) {
    try {
      const { remaining_time, session_id } = message;
      ClientSocketServices.sendMessageToClient(
        SESSION_TIMEOUT_EVENT,
        SUCCESS_STATUS_CODE,
        remaining_time,
        this.clientSocket.clientNameSpace,
        session_id
      );
    } catch (error: any) {
      console.log(
        `Error At ServerSessionTimeOutEventHandler (client = DJANOG) - ${error.message}`
      );
    }
  }
}
export default CommunicationService;
