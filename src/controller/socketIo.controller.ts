import type { Socket } from "socket.io";
// import ClientSocketServices from "./clientSocket.services";

class SocketIoServives {
  sessionMpas!: Record<string, Socket>;
  socket!: Socket;
  sessionId!: string;
  authToken!: string;

  constructor(socket: Socket, sessionMpas: Record<string, Socket>) {
    this.socket = socket;
    this.sessionMpas = sessionMpas;
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
      `client disconnectd - sessionId - ${
        this.sessionId
      } at ${Date.now().toString()}`
    );
  }

  onMessageEventHandler(message: any) {}

  sessionEndedhandler(message: string) {
    // const { data } = JSON.parse(message) as IEventMessage;
    // const { auth_token, session_id } = data?.data as ISessionEnded;
    // globalThis.bunSocket.sessionEndedHandler(session_id, auth_token);
  }
}

export default SocketIoServives;
