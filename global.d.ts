import type CommunicationService from "./src/services/communication.services";

declare global {
  var bunSocket: CommunicationService;
}

export const __global = globalThis as typeof globalThis & {
  bunSocket: CommunicationService;
};
