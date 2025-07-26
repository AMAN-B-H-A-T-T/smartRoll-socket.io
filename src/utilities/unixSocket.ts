import {
  HEALTHCHECK_INTERVAL,
  RECONNECTION_TIMEOUT,
} from "../configuration/env.config";
import * as consts from "../index.constant";
import CommanUtilites from "./utilities";

const net = require("net");

class UnixSocketClient {
  public client: any;
  public path: string = "";
  public dataBuffer: any;
  public connectionState: boolean = false;
  public serverReconnectionTimeLimit: any = null;
  public healthCheckIntervalRef: any = null;

  constructor(path: string) {
    //initilize
    this.path = path;
    this.dataBuffer = Buffer.alloc(0);
    //connect
    this._createUnixSocketConnection(path);

    //method to process data
  }

  private _clientConnectionCallback() {
    console.info(`Connected to server ...! ; path : ${this.path}`);
    // Connection established on the transport level – send handshake so the
    // Python server can acknowledge us with a `socket_connection` response.
    this._setServerConnectionState(true);
    this._sendConnectionACK();
    this._sendhealthCheck();
  }

  private _readServerMessage(data: any) {
    this.dataBuffer = Buffer.concat([this.dataBuffer, data]);
    while (this.dataBuffer.length >= 4) {
      const msgLen = this.dataBuffer.readUInt32BE(0);
      if (this.dataBuffer.length < 4 + msgLen) break;
      const msgBuf = this.dataBuffer.slice(4, 4 + msgLen);
      const msg = JSON.parse(msgBuf.toString());
      this.dataBuffer = this.dataBuffer.slice(4 + msgLen);
      +this._processEvent(msg);
    }
  }

  private _processEvent(data: any) {
    const { type } = data;
    try {
      switch (type) {
        case consts.HEALTHCHECK:
          console.info(`Event : ${consts.HEALTHCHECK} received from server`);
          return;
        case consts.ONGOING:
          break;
        case consts.CONNECTION:
          return this._sendConnectionACK();
        case consts.SOCKET_CONNECTION:
          console.log(`event : socket_connection : ${data}`);
          return this._setServerConnectionState(true);
        case consts.AUTHENTICATION:
          return globalThis.bunSocket.authenticationHandler(data);
        case consts.ONGOING_SESSION_DATA:
          console.log(
            `data received from event : ${consts.ONGOING_SESSION_DATA}`
          );
          return globalThis.bunSocket.onGoingSessionDataHandler(data);
        case consts.SESSION_DATA:
          return globalThis.bunSocket.sessionDataHandler(data);
        case consts.SESSION_ENDED:
          return globalThis.bunSocket.serverSessionEndEvent(data);
        case consts.REGULARIZATION_REQUEST:
          return globalThis.bunSocket.serverRegularizationEventHandler(data);
        case consts.REQUEST_APPROVED:
          return globalThis.bunSocket.serverRegularizationEventApprovedHandler(
            data
          );
        case consts.SESSION_TIMEOUT_EVENT:
          return globalThis.bunSocket.ServerSessionTimeOutEventHandler(data);
        case consts.UPDATE_ATTENDACE:
          return globalThis.bunSocket.serverStudentUpdateAttendanceMarkingApprove(
            data
          );
        case consts.AUDIO_PROCESSING: // acknowledgement for incoming audio
          const bunSock: any = (globalThis as any).bunSocket;
          if (bunSock && bunSock.serverAudioProcessingAck) {
            return bunSock.serverAudioProcessingAck(data);
          }
          console.info("Audio processing ack received", data);
          return;

        // Heart-beat ACK from the server
        case "pong":
          // We could toggle a heartbeat flag here; for now just log.
          console.info("Heartbeat pong received from server");
          return;
      }
    } catch (err: any) {
      console.error(
        `Error while process event:${type} , message : ${err.message}`
      );
    }
  }

  private _setServerConnectionState(state: boolean) {
    this.connectionState = state;
    console.info(
      `Server unix socket connection status : ${this.connectionState}`
    );
  }

  private _sendHealthCheckMessage() {
    const payload = {
      type: consts.HEALTHCHECK,
      msg: "Ping",
    };

    const msgBuff = CommanUtilites._prepareMessage({
      type: consts.HEALTHCHECK,
      data: payload,
    });

    //send event back to server
    return this.sendEvent(consts.HEALTHCHECK, msgBuff);
  }

  private _sendConnectionACK() {
    const payload = {
      type: consts.SOCKET_CONNECTION,
      msg: "Connection Established with Bun",
    };

    const msgBuff = CommanUtilites._prepareMessage({
      type: consts.SOCKET_CONNECTION,
      data: payload,
    });

    return this.sendEvent(consts.SOCKET_CONNECTION, msgBuff);
  }

  private _handleServerDisconnectionTimeOut() {
    this._setServerConnectionState(false);
    const timeOut = setTimeout(() => {
      globalThis.bunSocket.handleServerSocketDisconnection();
    }, RECONNECTION_TIMEOUT);
    this.setServerReconnectionTimeLimit(timeOut);
  }

  private _sendhealthCheck() {
    const ref = setInterval(() => {
      this._sendHealthCheckMessage();
    }, HEALTHCHECK_INTERVAL);
    this._setHealthCheckInterval(ref);
  }

  private _createUnixSocketConnection(path: string) {
    try {
      const client = net.createConnection({ path }, () =>
        this._clientConnectionCallback()
      );

      this.client = client;
      client.on("data", (data: any) => {
        this.setUnixClient(client);
        this._readServerMessage(data);
      });
      //method to handle disconnect timeout logic
      client.on("end", () => {
        console.warn("Server gets disconnect...");
        this._handleServerDisconnectionTimeOut();
        clearInterval(this.getHealthCheckInterval());
        this.cleanupClient();
        setTimeout(
          () => this._createUnixSocketConnection(path),
          RECONNECTION_TIMEOUT
        );
      });

      client.on("error", (err: any) => {
        if (err.code === "ENOENT") {
          console.error(`❌ Socket file not found at ${this.path}`);
          this.cleanupClient();
          setTimeout(
            () => this._createUnixSocketConnection(path),
            RECONNECTION_TIMEOUT
          );
          // Optionally retry connection later, or exit
        } else {
          console.error("Unexpected socket error:", err);
        }
      });
    } catch (error: any) {
      console.log(error.message);
    }
  }
  private _setHealthCheckInterval(ref: any) {
    this.healthCheckIntervalRef = ref;
  }

  private setServerReconnectionTimeLimit(timeOut: any) {
    this.serverReconnectionTimeLimit = timeOut;
  }

  private setUnixClient(client: any) {
    this.client = client;
  }

  private cleanupClient() {
    if (this.client) {
      this.client.removeAllListeners();
      this.client.destroy();
      this.client = null;
    }
  }

  public getServerReconnectionTimeLimit() {
    return this.serverReconnectionTimeLimit;
  }

  public getHealthCheckInterval() {
    return this.healthCheckIntervalRef;
  }

  public geetUnixClient() {
    return this.client;
  }

  public sendEvent(event: any, data: any) {
    if (!this.client && this.client.destroyed) {
      console.error("clinet is not available");
      return;
    }
    this.client.write(data);
    console.info(`Data sent for event : ${event}`);
  }

  public getConnectionState() {
    return this.connectionState;
  }
}

export default UnixSocketClient;
