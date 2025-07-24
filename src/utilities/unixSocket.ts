import * as consts from "../index.constant";

const net = require("net");

class UnixSocketClient {
  public client: any;
  public path: string = "";
  public dataBuffer: any;

  constructor(path: string) {
    //initilize
    this.path = path;
    this.dataBuffer = Buffer.alloc(0);
    //connect
    this.client = net.createConnection({ path }, () =>
      this._clientConnectionCallback()
    );

    //method to process data
    this.client.on("data", (data: any) => this._readServerMessage(data));
  }

  private _clientConnectionCallback() {
    console.info(`Connected to server ...! ; path : ${this.path}`);
  }

  private _readServerMessage(data: any) {
    this.dataBuffer = Buffer.concat([this.dataBuffer, data]);
    while (this.dataBuffer.length >= 4) {
      const msgLen = this.dataBuffer.readUInt32BE(0);
      if (this.dataBuffer.length < 4 + msgLen) break;
      const msgBuf = this.dataBuffer.slice(4, 4 + msgLen);
      const msg = JSON.parse(msgBuf.toString());
      this.dataBuffer = this.dataBuffer.slice(4 + msgLen);
      this._processEvent(msg);
      // Send next ping after receiving pong
      //   if (msg.type === "pong") {
      //     setTimeout(sendPing, 1000);
      //   }
    }
  }

  private _processEvent(data: any) {
    const { type } = data;
    try {
      switch (type) {
        case consts.HEALTHCHECK:
          break;
        case consts.ONGOING:
          break;
        case consts.CONNECTION:
          break;
        case consts.SOCKET_CONNECTION:
          break;
        case consts.AUTHENTICATION:
          break;
        case consts.ONGOING_SESSION_DATA:
          break;
        case consts.SESSION_DATA:
          break;
        case consts.SESSION_ENDED:
          break;
        case consts.DJANGOCLIENT:
          break;
        case consts.FECLIENT:
          break;
        case consts.SUCCESS_STATUS_CODE:
          break;
        case consts.ERROR:
          break;
        case consts.REGULARIZATION_REQUEST:
          break;
        case consts.REQUEST_APPROVED:
          break;
        case consts.AUDIO_PROCESSING:
          break;
        case consts.SESSION_TIMEOUT_EVENT:
          break;
        case consts.UPDATE_ATTENDACE:
          break;
      }
    } catch (err: any) {
      console.error(
        `Error while process event:${type} , message : ${err.message}`
      );
    }
  }
  public sendEvent(event: any, data: any) {
    this.client.write(data);
    console.info(`Data sent for event : ${event}`);
  }
}

export default UnixSocketClient;
