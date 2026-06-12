#include <node_api.h>

#include <stdint.h>
#include <stdio.h>
#include <string.h>

#if defined(_WIN32)
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#include <winsock2.h>
#include <ws2tcpip.h>
#include <mstcpip.h>
#include <iphlpapi.h>
#include <tcpestats.h>
#include <vector>
#else
#include <errno.h>
#include <limits.h>
#include <netinet/in.h>
#include <netinet/tcp.h>
#include <sys/socket.h>
#endif

static void SetBoolean(napi_env env, napi_value obj, const char* key, bool value) {
  napi_value js_key;
  napi_value js_value;
  napi_create_string_utf8(env, key, NAPI_AUTO_LENGTH, &js_key);
  napi_get_boolean(env, value, &js_value);
  napi_set_property(env, obj, js_key, js_value);
}

static void SetNumber(napi_env env, napi_value obj, const char* key, double value) {
  napi_value js_key;
  napi_value js_value;
  napi_create_string_utf8(env, key, NAPI_AUTO_LENGTH, &js_key);
  napi_create_double(env, value, &js_value);
  napi_set_property(env, obj, js_key, js_value);
}

static void SetString(napi_env env, napi_value obj, const char* key, const char* value) {
  napi_value js_key;
  napi_value js_value;
  napi_create_string_utf8(env, key, NAPI_AUTO_LENGTH, &js_key);
  napi_create_string_utf8(env, value, NAPI_AUTO_LENGTH, &js_value);
  napi_set_property(env, obj, js_key, js_value);
}

static napi_value Available(napi_env env, uint32_t rtt_micros) {
  napi_value result;
  napi_create_object(env, &result);
  SetBoolean(env, result, "available", true);
  SetNumber(env, result, "rttMicros", static_cast<double>(rtt_micros));
  return result;
}

static napi_value Unavailable(napi_env env, const char* error) {
  napi_value result;
  napi_create_object(env, &result);
  SetBoolean(env, result, "available", false);
  SetString(env, result, "error", error);
  return result;
}

#if defined(_WIN32)
static void FormatWindowsError(const char* operation, DWORD error, char* message, size_t message_size) {
  snprintf(message, message_size, "%s failed: %lu", operation, static_cast<unsigned long>(error));
}

static bool GetStringArg(napi_env env, napi_value value, char* buffer, size_t buffer_size) {
  size_t length = 0;
  if (napi_get_value_string_utf8(env, value, buffer, buffer_size, &length) != napi_ok) {
    return false;
  }

  return length > 0 && length < buffer_size;
}

static bool GetPortArg(napi_env env, napi_value value, uint16_t* port) {
  uint32_t port_value = 0;
  if (napi_get_value_uint32(env, value, &port_value) != napi_ok) {
    return false;
  }

  if (port_value == 0 || port_value > 65535) {
    return false;
  }

  *port = static_cast<uint16_t>(port_value);
  return true;
}

static bool ParseIpv4Address(const char* address, DWORD* parsed_address) {
  const char* normalized_address = address;
  if (strncmp(address, "::ffff:", 7) == 0) {
    normalized_address = address + 7;
  }

  IN_ADDR in_address;
  if (InetPtonA(AF_INET, normalized_address, &in_address) != 1) {
    return false;
  }

  *parsed_address = in_address.S_un.S_addr;
  return true;
}

static bool FindTcpRowByEndpoint(
  DWORD local_address,
  uint16_t local_port,
  DWORD remote_address,
  uint16_t remote_port,
  MIB_TCPROW* row,
  char* error,
  size_t error_size
) {
  DWORD table_size = 0;
  DWORD result = GetTcpTable(nullptr, &table_size, FALSE);
  if (result != ERROR_INSUFFICIENT_BUFFER) {
    FormatWindowsError("GetTcpTable(size)", result, error, error_size);
    return false;
  }

  std::vector<unsigned char> buffer(table_size);
  PMIB_TCPTABLE table = reinterpret_cast<PMIB_TCPTABLE>(buffer.data());
  result = GetTcpTable(table, &table_size, FALSE);
  if (result != NO_ERROR) {
    FormatWindowsError("GetTcpTable", result, error, error_size);
    return false;
  }

  const DWORD local_port_network_order = static_cast<DWORD>(htons(local_port));
  const DWORD remote_port_network_order = static_cast<DWORD>(htons(remote_port));
  for (DWORD i = 0; i < table->dwNumEntries; i++) {
    const MIB_TCPROW& candidate = table->table[i];
    if (
      candidate.dwLocalAddr == local_address &&
      candidate.dwLocalPort == local_port_network_order &&
      candidate.dwRemoteAddr == remote_address &&
      candidate.dwRemotePort == remote_port_network_order
    ) {
      *row = candidate;
      return true;
    }
  }

  snprintf(error, error_size, "TCP connection not found in IPv4 table");
  return false;
}

static napi_value GetTcpRttMicrosByEndpoint(napi_env env, napi_callback_info info) {
  size_t argc = 4;
  napi_value args[4];
  napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
  if (argc < 4) {
    return Unavailable(env, "local address, local port, remote address, and remote port arguments are required");
  }

  char local_address_string[96];
  char remote_address_string[96];
  if (!GetStringArg(env, args[0], local_address_string, sizeof(local_address_string))) {
    return Unavailable(env, "local address must be a non-empty string");
  }

  uint16_t local_port = 0;
  if (!GetPortArg(env, args[1], &local_port)) {
    return Unavailable(env, "local port must be a TCP port from 1 to 65535");
  }

  if (!GetStringArg(env, args[2], remote_address_string, sizeof(remote_address_string))) {
    return Unavailable(env, "remote address must be a non-empty string");
  }

  uint16_t remote_port = 0;
  if (!GetPortArg(env, args[3], &remote_port)) {
    return Unavailable(env, "remote port must be a TCP port from 1 to 65535");
  }

  DWORD local_address = 0;
  if (!ParseIpv4Address(local_address_string, &local_address)) {
    return Unavailable(env, "local address is not an IPv4 address");
  }

  DWORD remote_address = 0;
  if (!ParseIpv4Address(remote_address_string, &remote_address)) {
    return Unavailable(env, "remote address is not an IPv4 address");
  }

  char error[128];
  MIB_TCPROW row;
  memset(&row, 0, sizeof(row));
  if (!FindTcpRowByEndpoint(local_address, local_port, remote_address, remote_port, &row, error, sizeof(error))) {
    return Unavailable(env, error);
  }

  TCP_ESTATS_FINE_RTT_RW_v0 rw;
  memset(&rw, 0, sizeof(rw));
  rw.EnableCollection = TRUE;
  DWORD result = SetPerTcpConnectionEStats(
    &row,
    TcpConnectionEstatsFineRtt,
    reinterpret_cast<PUCHAR>(&rw),
    0,
    sizeof(rw),
    0
  );
  if (result != NO_ERROR) {
    FormatWindowsError("SetPerTcpConnectionEStats(TcpConnectionEstatsFineRtt)", result, error, sizeof(error));
    return Unavailable(env, error);
  }

  TCP_ESTATS_FINE_RTT_ROD_v0 rod;
  memset(&rod, 0, sizeof(rod));
  result = GetPerTcpConnectionEStats(
    &row,
    TcpConnectionEstatsFineRtt,
    nullptr,
    0,
    0,
    nullptr,
    0,
    0,
    reinterpret_cast<PUCHAR>(&rod),
    0,
    sizeof(rod)
  );
  if (result != NO_ERROR) {
    FormatWindowsError("GetPerTcpConnectionEStats(TcpConnectionEstatsFineRtt)", result, error, sizeof(error));
    return Unavailable(env, error);
  }

  return Available(env, rod.SumRtt);
}
#endif

static napi_value GetTcpRttMicros(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
  if (argc < 1) {
    return Unavailable(env, "socket file descriptor argument missing");
  }

  int64_t fd_value = -1;
  if (napi_get_value_int64(env, args[0], &fd_value) != napi_ok) {
    return Unavailable(env, "socket file descriptor must be a number");
  }

#if defined(_WIN32)
#if defined(SIO_TCP_INFO)
  SOCKET socket = static_cast<SOCKET>(fd_value);
  if (socket == INVALID_SOCKET) {
    return Unavailable(env, "invalid socket");
  }

  DWORD version = 0;
  TCP_INFO_v0 tcp_info;
  memset(&tcp_info, 0, sizeof(tcp_info));
  DWORD bytes_returned = 0;
  const int result = WSAIoctl(
    socket,
    SIO_TCP_INFO,
    &version,
    sizeof(version),
    &tcp_info,
    sizeof(tcp_info),
    &bytes_returned,
    nullptr,
    nullptr
  );

  if (result == SOCKET_ERROR) {
    char message[96];
    snprintf(message, sizeof(message), "WSAIoctl(SIO_TCP_INFO) failed: %d", WSAGetLastError());
    return Unavailable(env, message);
  }

  return Available(env, tcp_info.RttUs);
#else
  return Unavailable(env, "SIO_TCP_INFO is unavailable in this Windows SDK");
#endif
#elif defined(__linux__)
  if (fd_value < 0 || fd_value > INT_MAX) {
    return Unavailable(env, "invalid socket file descriptor");
  }

  struct tcp_info tcp_info;
  memset(&tcp_info, 0, sizeof(tcp_info));
  socklen_t tcp_info_len = sizeof(tcp_info);
  if (getsockopt(static_cast<int>(fd_value), IPPROTO_TCP, TCP_INFO, &tcp_info, &tcp_info_len) != 0) {
    return Unavailable(env, strerror(errno));
  }

  return Available(env, tcp_info.tcpi_rtt);
#else
  return Unavailable(env, "TCP RTT is unsupported on this platform");
#endif
}

static napi_value Init(napi_env env, napi_value exports) {
  napi_value fn;
  napi_create_function(env, nullptr, 0, GetTcpRttMicros, nullptr, &fn);
  napi_set_named_property(env, exports, "getTcpRttMicros", fn);
#if defined(_WIN32)
  napi_create_function(env, nullptr, 0, GetTcpRttMicrosByEndpoint, nullptr, &fn);
  napi_set_named_property(env, exports, "getTcpRttMicrosByEndpoint", fn);
#endif
  return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
