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
  UPDATE_ATTENDACE,
} from "../index.constant";
import type SocketIo from "../utilities/clientSocket";
import type { IEventData, IEventMessage } from "../index.types";
import type ClientSocket from "../utilities/clientSocket";
import ClientSocketServices from "./clientSocket.services";
import CommanUtilites from "../utilities/utilities";

class CommunicationService {
  clientSocket!: SocketIo;
  unixSocket!: any;
  io!: Server;

  constructor(clientSocket: ClientSocket, unixSocket: any, io: Server) {
    //set the reference of the the client socket class
    this.clientSocket = clientSocket;
    //set the reference of io server
    this.io = io;
    //set refrence of unixSocket
    this.unixSocket = unixSocket;
  }

  private _buildMessage({ type, data, messageHeader }: any) {
    /*
     * Build a message buffer compatible with the Python Unix-socket server.
     * When `type === AUDIO_PROCESSING` we expect raw audio bytes (`data`) and
     * a `messageHeader` object that already contains the required metadata
     * (type, session_id, auth_token, start_time, audio_length).
     * For all other cases `data` is assumed to be the JSON header itself.
     */

    const headerLenBuf = Buffer.alloc(4);

    // Audio payload ➜ header + binary
    if (type === AUDIO_PROCESSING && Buffer.isBuffer(data) && messageHeader) {
      const headerBuf = Buffer.from(JSON.stringify(messageHeader));
      headerLenBuf.writeUInt32BE(headerBuf.length);
      return Buffer.concat([headerLenBuf, headerBuf, data]);
    }

    // Default ➜ just JSON header
    const headerBuf = Buffer.from(JSON.stringify(data));
    headerLenBuf.writeUInt32BE(headerBuf.length);
    return Buffer.concat([headerLenBuf, headerBuf]);
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
        type: AUTHENTICATION,
        session_id: sessionId,
        auth_token: authToken,
      };

      const requestBuffer = CommanUtilites._prepareMessage({
        type: AUTHENTICATION,
        data: payload,
      });

      this.unixSocket.sendEvent(AUTHENTICATION, requestBuffer);
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
      const payload = {
        type: ONGOING_SESSION_DATA,
        session_id: session_id,
        auth_token: auth_token,
      };
      console.log(payload);
      const requestBuffer = CommanUtilites._prepareMessage({
        type: ONGOING_SESSION_DATA,
        data: payload,
      });

      this.unixSocket.sendEvent(ONGOING_SESSION_DATA, requestBuffer);
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

      // ServerSocketService.sendMessage(
      //   SESSION_ENDED,
      //   DJANGOCLIENT,
      //   SUCCESS_STATUS_CODE,
      //   payload,
      //   this.serverSocket.socketInstance,
      //   "req"
      // );
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
      // const socket: Socket | null = this.getSocketClientInstance(session_id);
      if (status_code === 500) {
        return ClientSocketServices.sendErrorMessageToRoom(
          errorMessage as string,
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
      this.unixSocket._setServerConnectionState(false);
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
        type: SESSION_ENDED,
        session_id: session_id,
        auth_token: auth_token,
      };

      const payloadBuf = CommanUtilites._prepareMessage({
        type: SESSION_ENDED,
        data: payload,
      });
      // ServerSocketService.sendMessage(
      //   SESSION_ENDED,
      //   DJANGOCLIENT,
      //   SUCCESS_STATUS_CODE,
      //   data,
      //   this.serverSocket.socketInstance,
      //   "req"
      // );
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
        type: REGULARIZATION_REQUEST,
        session_id,
        auth_token,
        data,
      };
      const messageBuf = CommanUtilites._prepareMessage({
        type: REGULARIZATION_REQUEST,
        data: payload,
      });
      return this.unixSocket.sendEvent(REGULARIZATION_REQUEST, messageBuf);
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
        type: SESSION_ENDED,
        session_id,
        auth_token,
      };

      const messageBuf = CommanUtilites._prepareMessage({
        type: SESSION_ENDED,
        data: payload,
      });
      return this.unixSocket.sendEvent(SESSION_ENDED, messageBuf);
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

  async clientAudioProcessingEventHandler(
    session_id: string,
    auth_token: string,
    blob: any,
    timestamp: string
  ) {
    try {
      // Convert the incoming Blob to raw PCM bytes
      const audioBuf: Buffer = Buffer.from(await blob.arrayBuffer());

      // Build header expected by Python server
      const header = {
        type: AUDIO_PROCESSING, // "incoming_audio_chunks"
        session_id,
        auth_token,
        start_time: timestamp,
        audio_length: audioBuf.length,
      };

      const messageBuf = CommanUtilites._prepareMessage({
        type: AUDIO_PROCESSING,
        data: audioBuf,
        header: header,
      });

      return this.unixSocket.sendEvent(AUDIO_PROCESSING, messageBuf);
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

  studentUpadteAttendanceMarkingRequest(payload: any) {
    try {
      const messageBuf = CommanUtilites._prepareMessage({
        type: UPDATE_ATTENDACE,
        data: { ...payload, type: UPDATE_ATTENDACE },
      });
      return this.unixSocket.sendEvent(UPDATE_ATTENDACE, messageBuf);
    } catch (error: any) {
      console.log(
        `Error At studentUpadteAttendanceMarkingRequest (client = FE) - ${error.message}`
      );
    }
  }

  serverStudentUpdateAttendanceMarkingApprove(message: any) {
    try {
      const { data, status_code } = message;
      const { session_id } = data;
      ClientSocketServices.sendMessageToClient(
        UPDATE_ATTENDACE,
        status_code,
        data,
        this.clientSocket.clientNameSpace,
        session_id
      );
    } catch (error: any) {
      console.log(
        `Error At serverStudentUpdateAttendanceMarkingApprove (client = DJANGO) - ${error.message}`
      );
    }
  }
}
export default CommunicationService;
