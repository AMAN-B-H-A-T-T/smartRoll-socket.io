import type { Socket } from "socket.io";
import ClientSocketServices from "../services/clientSocket.services";
// import ClientSocketServices from "./clientSocket.services";

class SocketIoServices {
  sessionMaps!: Record<string, Socket>;
  socket!: Socket;
  sessionId!: string;
  authToken!: string;

  constructor(socket: Socket, sessionMaps: Record<string, Socket>) {
    this.socket = socket;
    this.sessionMaps = sessionMaps;
    // this.onOpenEventHandler();
  }

  onOpenEventHandler(session_id: string, auth_token: string) {
    // const authHeader =
    //   this.socket.handshake.headers.auth || this.socket.handshake.auth.token;
    // // Check if it's an array and take the first element, or convert it to a string if it's a single value
    // const token: string | undefined = Array.isArray(authHeader)
    //   ? authHeader[0]
    //   : authHeader?.toString();
    // const query = this.socket.handshake.query.session_id;

    // const session_id: string | undefined = Array.isArray(query)
    //   ? query[0]
    //   : query?.toString();
    // Check that both session_id and token are defined
    // if (auth_token.trim() === "" || session_id.trim() === "") {
    //   console.log("Missing session ID or token");
    //   this.socket.disconnect(true); // Disconnect the socket if either is undefined
    //   return;
    // }

    this.sessionId = session_id;
    this.authToken = auth_token;
    this.socket.join(session_id);
    // if (this.sessionMpas[session_id]) {
    //   console.log(session_id);
    //   ClientSocketServices.sendErrorMessageToClient(
    //     "connection is already opened",
    //     this.socket,
    //     409
    //   );
    //   // this.socket.emit("client_error", "hello");
    //   return this.socket.disconnect(true);
    // }
    // this.sessionMpas[session_id] = this.socket;

    globalThis.bunSocket.validateTeacher(session_id, auth_token);
  }

  onCloseEventHandler() {
    // if (this.sessionMpas[this.sessionId]) {
    //   console.log("hello disconnect");

    //   delete this.sessionMpas[this.sessionId];
    // }
    // console.log(Object.keys(this.sessionMpas).length);
    console.log(
      `client disconnected - sessionId - ${
        this.sessionId
      } at ${Date.now().toString()}`
    );
  }

  regularizationAttendanceHandler(message: any) {
    console.log(
      "🚀 ~ SocketIoServices ~ regularizationAttendanceHandler ~ message:",
      message
    );
    const { session_id, auth_token, data } = message;
    if (
      !session_id ||
      !auth_token ||
      session_id.trim() === "" ||
      auth_token.trim() === ""
    ) {
      ClientSocketServices.sendErrorMessageToClient(
        "please provide the valid session id and auth token",
        this.socket,
        500
      );
      return this.socket.disconnect(true);
    }

    globalThis.bunSocket.regularizationEventHandler(
      session_id,
      auth_token,
      data
    );
  }

  onMessageEventHandler(message: any) {}

  sessionEndedhandler(message: string) {
    // const { data } = JSON.parse(message) as IEventMessage;
    // const { auth_token, session_id } = data?.data as ISessionEnded;
    // globalThis.bunSocket.sessionEndedHandler(session_id, auth_token);
  }

  handleClientSessionEnded(message: any) {
    const { session_id, auth_token } = message;
    if (
      !session_id ||
      !auth_token ||
      session_id.trim() === "" ||
      auth_token.trim() === ""
    ) {
      ClientSocketServices.sendErrorMessageToClient(
        "please provide the valid session id and auth token",
        this.socket,
        500
      );
      return this.socket.disconnect(true);
    }
    globalThis.bunSocket.clientSessionEndEvent(session_id, auth_token);
  }
}

export default SocketIoServices;
