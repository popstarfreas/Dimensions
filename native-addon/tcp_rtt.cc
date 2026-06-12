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
  return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
