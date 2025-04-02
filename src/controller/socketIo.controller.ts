import type { Socket } from "socket.io";
import ClientSocketServices from "../services/clientSocket.services";

class SocketIoServices {
  sessionMaps!: Record<string, Socket>;
  socket!: Socket;
  sessionId!: string;
  authToken!: string;

  constructor(socket: Socket, sessionMaps: Record<string, Socket>) {
    this.socket = socket;
    this.sessionMaps = sessionMaps;
  }

  onOpenEventHandler(session_id: string, auth_token: string) {
    this.sessionId = session_id;
    this.authToken = auth_token;
    this.socket.join(session_id);

    globalThis.bunSocket.validateTeacher(session_id, auth_token);
  }

  onCloseEventHandler() {
    console.log(
      `client disconnected - sessionId - ${
        this.sessionId
      } at ${Date.now().toString()}`
    );
  }

  /**
   * @param message
   * @event regulization_request
   */
  regularizationAttendanceHandler(message: any) {
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

  /**
   * @param message
   * @event session_ended
   */

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
