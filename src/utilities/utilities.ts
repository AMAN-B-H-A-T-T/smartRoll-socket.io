import type { IPrepareMessage } from "./utilities.type";

class CommanUtilites {
  static _prepareMessage({ type, data, header }: IPrepareMessage) {
    const headerBufLen = Buffer.alloc(4);
    if (type === "audio") {
      const headerBuffer = Buffer.from(JSON.stringify(header));
      headerBufLen.writeUInt32BE(headerBuffer.length);
      return Buffer.concat([headerBufLen, headerBuffer, data]);
    } else {
      const jsonBuf = Buffer.from(JSON.stringify(data));
      headerBufLen.writeInt32BE(jsonBuf.length);
      return Buffer.concat([headerBufLen, jsonBuf]);
    }
  }
}

export default CommanUtilites;
