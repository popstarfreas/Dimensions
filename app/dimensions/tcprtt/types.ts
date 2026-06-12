export type TcpRttSource = "tcp-info" | "unavailable";

export interface TcpRttSample {
  available: boolean;
  rttMicros: number | null;
  rttMs: number | null;
  updatedAt: number | null;
  source: TcpRttSource;
  error?: string;
}

export interface TcpRttClientSummary {
  id: string;
  uuid: string;
  name: string;
  ip: string;
  server: string;
  playerId: number | null;
  clientRtt: TcpRttSample;
  serverRtt: TcpRttSample;
  overallRtt: TcpRttSample;
  available: boolean;
  rttMicros: number | null;
  rttMs: number | null;
  updatedAt: number | null;
  source: TcpRttSource;
  error?: string;
}

export interface TcpRttTracking {
  clients: { [id: string]: TcpRttClientSummary };
}

export function unavailableTcpRttSample(error?: string): TcpRttSample {
  return {
    available: false,
    rttMicros: null,
    rttMs: null,
    updatedAt: null,
    source: "unavailable",
    error,
  };
}

export function tcpInfoSample(rttMicros: number, updatedAt = Date.now()): TcpRttSample {
  return {
    available: true,
    rttMicros,
    rttMs: rttMicros / 1000,
    updatedAt,
    source: "tcp-info",
  };
}

export function combineTcpRttSamples(clientRtt: TcpRttSample, serverRtt: TcpRttSample): TcpRttSample {
  if (clientRtt.rttMicros === null || serverRtt.rttMicros === null) {
    return unavailableTcpRttSample("overall TCP RTT unavailable");
  }

  return tcpInfoSample(clientRtt.rttMicros + serverRtt.rttMicros, Math.max(clientRtt.updatedAt ?? 0, serverRtt.updatedAt ?? 0));
}
