import type { Namespace, Socket } from "socket.io";
import { ERROR, FECLIENT } from "../index.constant";

class ClientSocketServices {
  static sendaMessageToClient(
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
    console.log(responseObj);
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

  static disconnectClinet(namespace: Namespace, session_id: string) {
    namespace
      .in(session_id)
      .fetchSockets()
      .then((sockets) =>
        Promise.all(sockets.map((socket) => socket.disconnect(true)))
      )
      .then(() =>
        console.log(`All clients in session ${session_id} disconnected.`)
      )
      .catch((err) => console.error("Error disconnecting clients:", err));
  }

  static disconnectAllActiveClient(nameSpace: Namespace) {
    nameSpace
      .fetchSockets()
      .then((sockets) => {
        return Promise.all(sockets.map((socket) => socket.disconnect(true)));
      })
      .then(() => {
        console.log("All clients disconnected.");
      })
      .catch((error) =>
        console.log(`disconnectAllActiveClient - ${error.message}`)
      );
  }
}

export default ClientSocketServices;
