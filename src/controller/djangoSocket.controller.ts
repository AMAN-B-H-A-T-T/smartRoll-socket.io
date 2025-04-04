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
  SOCKET_CONNECTION,
  SUCCESS_STATUS_CODE,
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
      //set the connection_state to true after the successfull connection
      // this.socketInstance.connection_state = true;

      this.socketInstance.setConnectionStatus(true);
    
      // emit the evetn : socket_connection to sever
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
     * @description event for the health-check to enusur server connection is alive
     */
    this.socket.on(HEALTHCHECK, () => {
      const responseObj = {
        data: "pong",
      };
      console.log("health-check");
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
     * @description get the details of the students whose the attendace is marked
     */
    this.socket.on(SESSION_DATA, (messaege: IEventMessage) => {
      //todo: create the handler in communication srvices
      
      globalThis.bunSocket.sessionDataHandler(messaege);
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
