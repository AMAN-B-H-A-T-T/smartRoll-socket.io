import type { Namespace, Socket } from "socket.io";
import { ERROR, FECLIENT } from "../index.constant";

class ClientSocketServices {
  static sendMessageToClient(
    event: string,
    status_code: number,
    data: any,
    clientNameSpace: Namespace,
    session_id: string
  ) {
    const responseObj = {
      event,
      client: FECLIENT,
      status_code,
      data: {
        data,
      },
    };
    clientNameSpace.to(session_id).emit(event, responseObj);
  }

  static sendErrorMessageToClient(
    message: string,
    socket: Socket | null,
    status_code: number
  ) {
    const responseObj = {
      event: ERROR,
      client: FECLIENT,
      status_code: status_code,
      data: message,
    };
    socket?.emit(ERROR, responseObj);
  }

  static sendErrorMessageToRoom(
    message: string,
    session_id: string,
    nameSpace: Namespace,
    status_code: number
  ) {
    const errorObject = {
      event: ERROR,
      clinet: FECLIENT,
      status_code: status_code,
      data: message,
    };
    nameSpace.to(session_id).emit(ERROR, errorObject);
  }

  static disconnectClient(namespace: Namespace, session_id: string) {
    namespace
      .in(session_id)
      .fetchSockets()
      .then((sockets) =>
        Promise.all(sockets.map((socket) => socket.disconnect(true)))
      )
      .catch((err) => console.error("Error disconnecting clients:", err));
  }

  static disconnectAllActiveClient(nameSpace: Namespace) {
    nameSpace
      .fetchSockets()
      .then((sockets) => {
        return Promise.all(sockets.map((socket) => socket.disconnect(true)));
      })
      .catch((error) =>
        console.log(`disconnectAllActiveClient - ${error.message}`)
      );
  }
}

export default ClientSocketServices;
