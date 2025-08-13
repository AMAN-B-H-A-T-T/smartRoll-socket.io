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
      message: data.message,
      attendance_slug: data.attendance_slug,
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
    try {
      const responseObj = {
        event: ERROR,
        client: FECLIENT,
        status_code: status_code,
        data: message,
      };
      socket?.emit(ERROR, JSON.stringify(responseObj));
      console.log(`Error message send : ${JSON.stringify(responseObj)}`);
    } catch (error: any) {
      console.log(error.message);
    }
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

  static async removeClientsFromRoom(namespace: Namespace, roomName: string) {
    try {
      const sockets = await namespace.in(roomName).fetchSockets();
      console.log(`Found ${sockets.length} clients in ${roomName}`);

      await Promise.all(sockets.map((socket) => socket.leave(roomName)));

      // ✅ Check how many are left
      const remaining = await namespace.in(roomName).fetchSockets();
      console.log(`Remaining clients in ${roomName}: ${remaining.length}`);
    } catch (err) {
      console.error("Error removing clients from room:", err);
    }
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
