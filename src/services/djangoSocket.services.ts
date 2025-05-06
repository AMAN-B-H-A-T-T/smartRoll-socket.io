import type { Socket } from "socket.io";
import { DJANGOCLIENT } from "../index.constant";

class ServerSocketService {
  static sendMessage(
    event: string,
    client: string,
    status_code: number,
    data: any,
    socket: Socket,
    type: string
  ) {
    const responseObj: any = {
      event,
      client,
      status_code,
      data,
    };
    if (type === "req") {
      const obj = { ...data, client: DJANGOCLIENT };
      // console.log(obj);
      return socket && socket.emit(event, obj);
    }

    socket && socket.emit(event, responseObj);
  }
}

export default ServerSocketService;
