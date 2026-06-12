{
  "targets": [
    {
      "target_name": "dimensions_tcp_rtt",
      "sources": [
        "tcp_rtt.cc"
      ],
      "defines": [
        "NAPI_VERSION=8"
      ],
      "conditions": [
        [
          "OS==\"win\"",
          {
            "libraries": [
              "ws2_32.lib",
              "iphlpapi.lib"
            ]
          }
        ]
      ]
    }
  ]
}
