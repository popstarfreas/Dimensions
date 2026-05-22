export type DisconnectScope = "dimension" | "dimensions";

export interface DisconnectReason {
  code: string;
  detail: string;
}

export const DisconnectReasonCodes = {
  Blacklisted: "blacklisted",
  BlacklistCheckError: "blacklist_check_error",
  ClientConnectionReset: "client_connection_reset",
  ClientDisconnectedFromDimensions: "client_disconnected_from_dimensions",
  ClientLeftDimension: "client_left_dimension",
  ClientSocketClosed: "client_socket_closed",
  ClientSocketError: "client_socket_error",
  ClientSocketTimeout: "client_socket_timeout",
  ConnectionLimitExceeded: "connection_limit_exceeded",
  ConnectionRateLimitExceeded: "connection_rate_limit_exceeded",
  DimensionSwitch: "dimension_switch",
  DimensionsDisconnectPacket: "dimensions_disconnect_packet",
  NoServersAvailable: "no_servers_available",
  RawSocketDisconnect: "raw_socket_disconnect",
  ServerConnectionRefused: "server_connection_refused",
  ServerConnectionReset: "server_connection_reset",
  ServerDisconnectPacket: "server_disconnect_packet",
  ServerInvalidPacketLength: "server_invalid_packet_length",
  ServerSocketClosed: "server_socket_closed",
  ServerSocketError: "server_socket_error",
  ServerSocketTimeout: "server_socket_timeout",
} as const;

export function makeDisconnectReason(code: string, detail: string): DisconnectReason {
  return {
    code,
    detail: detail.length > 0 ? detail : code,
  };
}

export function formatDisconnectReason(reason: DisconnectReason): string {
  return `reason: ${reason.code}; detail: ${reason.detail}`;
}

export function detailFromDisconnectMessage(reason: unknown): string {
  if (typeof reason === "string") {
    return reason;
  }

  if (typeof reason === "object" && reason !== null && "text" in reason) {
    const text = (reason as { text?: unknown }).text;
    if (typeof text === "string") {
      return text;
    }
  }

  return "Unknown reason";
}

export function getErrorCode(error: Error): string | undefined {
  const code = (error as Error & { code?: unknown }).code;
  if (typeof code === "string") {
    return code;
  }

  const match = /\bE[A-Z]+\b/.exec(error.message);
  return match?.[0];
}

export function clientSocketErrorReason(error: Error): DisconnectReason {
  const code = getErrorCode(error);
  switch (code) {
    case "ECONNRESET":
      return makeDisconnectReason(DisconnectReasonCodes.ClientConnectionReset, `client socket reset: ${error.message}`);
    case "ETIMEDOUT":
      return makeDisconnectReason(DisconnectReasonCodes.ClientSocketTimeout, `client socket timed out: ${error.message}`);
    default:
      return makeDisconnectReason(DisconnectReasonCodes.ClientSocketError, `client socket error: ${error.message}`);
  }
}

export function serverSocketErrorReason(error: Error): DisconnectReason {
  const code = getErrorCode(error);
  switch (code) {
    case "ECONNREFUSED":
      return makeDisconnectReason(DisconnectReasonCodes.ServerConnectionRefused, `backend socket refused connection: ${error.message}`);
    case "ECONNRESET":
      return makeDisconnectReason(DisconnectReasonCodes.ServerConnectionReset, `backend socket reset: ${error.message}`);
    case "ETIMEDOUT":
      return makeDisconnectReason(DisconnectReasonCodes.ServerSocketTimeout, `backend socket timed out: ${error.message}`);
    default:
      return makeDisconnectReason(DisconnectReasonCodes.ServerSocketError, `backend socket error: ${error.message}`);
  }
}
