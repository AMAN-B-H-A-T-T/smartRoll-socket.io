import net from "net";

import {
  HEALTHCHECK_INTERVAL,
  RECONNECTION_TIMEOUT,
} from "./configuration/env.config";
import * as consts from "./index.constant";
// prevents TS errors
declare var self: Worker;
interface IPrepareMessage {
  type: string;
  header?: any;
  data: any;
}

let client: net.Socket | any = null;
let path: string | null = null;
let dataBuffer = Buffer.alloc(0);
let healthCheckInterval: any = null;

self.onmessage = (event: MessageEvent) => {
  const { type, data, header } = event.data;
  let msgBuffer = null;
  console.log(`message received from main thread : ${type}`);
  switch (type) {
    case consts.CONNECTION:
      path = data.path;
      _createUnixSocketConnection(path as string);
      break;
    case consts.AUTHENTICATION:
    case consts.SESSION_DATA:
    case consts.SESSION_ENDED:
    case consts.REGULARIZATION_REQUEST:
    case consts.ONGOING_SESSION_DATA:
    case consts.UPDATE_ATTENDACE:
      msgBuffer = _prepareMessage({ type, data });
      sendEvent(type, msgBuffer);
      break;
    case consts.AUDIO_PROCESSING:
      msgBuffer = _prepareMessage({
        type,
        data,
        header,
      });
      sendEvent(type, msgBuffer);
      break;
  }
};

function _sendConnectionACK() {
  const payload = {
    type: consts.SOCKET_CONNECTION,
    msg: "Connection Established with Bun",
  };

  const msgBuff = _prepareMessage({
    type: consts.SOCKET_CONNECTION,
    data: payload,
  });

  return sendEvent(consts.SOCKET_CONNECTION, msgBuff);
}

function _clientConnectionCallback() {
  console.info(`Connected to server ...! ; path : ${path}`);
  _sendConnectionACK();
  _sendhealthCheck();
  sendToMainTread({
    type: "connected",
    message: `connected to server at - ${new Date().getTime()}`,
    data: null,
  });
}

function _createUnixSocketConnection(path: string) {
  try {
    client = net.createConnection({ path }, () => _clientConnectionCallback());

    client.on("data", (data: any) => {
      _readServerMessage(data);
    });
    //method to handle disconnect timeout logic
    client.on("end", () => {
      console.warn("Server gets disconnect...");
      clearInterval(healthCheckInterval);
      cleanupClient();
      setTimeout(() => _createUnixSocketConnection(path), RECONNECTION_TIMEOUT);
      sendToMainTread({
        type: "disconnected",
        message: `disconnected to server at - ${new Date().getTime()}`,
        data: null,
      });
    });

    client.on("error", (err: any) => {
      console.log(err);
      if (err.code === "ENOENT") {
        console.error(`❌ Socket file not found at ${path}`);
        cleanupClient();
        setTimeout(
          () => _createUnixSocketConnection(path),
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

function cleanupClient() {
  if (client) {
    client.removeAllListeners();
    client.destroy();
    client = null;
  }
}

function _readServerMessage(data: any) {
  dataBuffer = Buffer.concat([dataBuffer, data]);
  while (dataBuffer.length >= 4) {
    const msgLen = dataBuffer.readUInt32BE(0);
    if (dataBuffer.length < 4 + msgLen) break;
    const msgBuf = dataBuffer.slice(4, 4 + msgLen);
    const msg = JSON.parse(msgBuf.toString());
    dataBuffer = dataBuffer.slice(4 + msgLen);
    _processEvent(msg);
  }
}

function _processEvent(data: any) {
  const { type } = data;
  self.postMessage({
    type,
    message: `Event from Server : ${type} - ${JSON.stringify(data)}`,
    data,
  });
  console.info(`Event: ${type} received from server`);
}

function _prepareMessage({ type, data, header }: IPrepareMessage) {
  try {
    const headerBufLen = Buffer.alloc(4);
    if (type === "incoming_audio_chunks") {
      const headerBuffer = Buffer.from(JSON.stringify(header));
      headerBufLen.writeUInt32BE(headerBuffer.length);
      return Buffer.concat([headerBufLen, headerBuffer, data]);
    } else {
      const jsonBuf = Buffer.from(JSON.stringify(data));
      headerBufLen.writeInt32BE(jsonBuf.length);
      return Buffer.concat([headerBufLen, jsonBuf]);
    }
  } catch (error: any) {
    console.log(`Error at _preapareMessage : ${error.message}`);
  }
}

function _sendHealthCheckMessage() {
  const payload = {
    type: consts.HEALTHCHECK,
    msg: "Ping",
  };

  const msgBuff = _prepareMessage({
    type: consts.HEALTHCHECK,
    data: payload,
  });

  //send event back to server
  return sendEvent(consts.HEALTHCHECK, msgBuff);
}

function _sendhealthCheck() {
  healthCheckInterval = setInterval(() => {
    _sendHealthCheckMessage();
  }, HEALTHCHECK_INTERVAL);
}

function sendEvent(event: any, data: any) {
  if (!client && client.destroyed) {
    console.error("clinet is not available");
    return;
  }
  client.write(data);
  console.info(`Data sent for event : ${event}`);
}

function sendToMainTread({ type, message, data }: any) {
  self.postMessage({
    type,
    message,
    data: data ?? null,
  });
}
