import type { Socket } from "socket.io";
import {
  AUTHENTICATION,
  DJANGOCLIENT,
  HEALTHCHECK,
  ONGOING_SESSION_DATA,
  REGULARIZATION_REQUEST,
  REQUEST_APPROVED,
  SESSION_DATA,
  SESSION_ENDED,
  SESSION_TIMEOUT_EVENT,
  SOCKET_CONNECTION,
  SUCCESS_STATUS_CODE,
  UPDATE_ATTENDACE,
} from "../index.constant";
import ServerSocketService from "../services/djangoSocket.services";
import type { IEventMessage } from "../index.types";
import type ServerSocket from "../utilities/djangoSocket";

class ServerSocketController {
  socket!: Socket;
  socketInstance!: ServerSocket;

  constructor(socket: Socket, socketInstance: ServerSocket) {
    this.socket = socket;
    this.socketInstance = socketInstance;
    this.eventHandler();
  }

  private eventHandler() {
    /**
     *
     * @event socket_connection
     */
    this.socket.on(SOCKET_CONNECTION, (message: IEventMessage) => {
      //set the connection_state to true after the successful connection
      // this.socketInstance.connection_state = true;

      this.socketInstance.setConnectionStatus(true);

      // emit the event : socket_connection to sever
      ServerSocketService.sendMessage(
        SOCKET_CONNECTION,
        DJANGOCLIENT,
        SUCCESS_STATUS_CODE,
        "connection established successfully",
        this.socket,
        "res"
      );
    });

    /**
     * @event health_check
     * @description event for the health-check to ensure server connection is alive
     */
    this.socket.on(HEALTHCHECK, () => {
      const responseObj = {
        data: "pong",
      };
      ServerSocketService.sendMessage(
        HEALTHCHECK,
        DJANGOCLIENT,
        SUCCESS_STATUS_CODE,
        responseObj,
        this.socket,
        "res"
      );
    });

    /**
     * @event authentication
     * @description validate and authenticate the teacher auth_token and session
     */
    this.socket.on(AUTHENTICATION, (message: IEventMessage) => {
      globalThis.bunSocket.authenticationHandler(message);
    });

    /**
     * @event on_going_session_data
     * @description get the on going session data in case of re-connection or page reload
     */
    this.socket.on(ONGOING_SESSION_DATA, (data) => {
      globalThis.bunSocket.onGoingSessionDataHandler(data);
    });

    /**
     * @event session_data
     * @description get the details of the students whose the attendance is marked
     */
    this.socket.on(SESSION_DATA, (message: IEventMessage) => {
      globalThis.bunSocket.sessionDataHandler(message);
    });

    /**
     * @event session_ended
     * @description perform action when the session gone ended
     */
    this.socket.on(SESSION_ENDED, (message) => {
      globalThis.bunSocket.serverSessionEndEvent(message);
    });

    this.socket.on(REGULARIZATION_REQUEST, (message) => {
      globalThis.bunSocket.serverRegularizationEventHandler(message);
    });

    this.socket.on(REQUEST_APPROVED, (message: any) => {
      globalThis.bunSocket.serverRegularizationEventApprovedHandler(message);
    });

    this.socket.on(UPDATE_ATTENDACE, (message: any) => {
      globalThis.bunSocket.serverStudentUpdateAttendanceMarkingApprove(message);
    });

    this.socket.on(SESSION_TIMEOUT_EVENT, (message: any) => {
      globalThis.bunSocket.ServerSessionTimeOutEventHandler(message);
    });

    /**
     * @event disconnect
     * @description close the connection to the server
     */
    this.socket.on("disconnect", () => {
      // this.socketInstance.connection_state = false;
      this.socketInstance.handleServerDisconnectionTimeOut();
      console.log(
        `disconnected successfully at time - ${Date.now().toString()}`
      );
    });
  }
}

export default ServerSocketController;
