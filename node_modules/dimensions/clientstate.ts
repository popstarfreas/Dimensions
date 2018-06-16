enum ClientState {
    FreshConnection = 0,
    FinishinedSendingInventory,
    ConnectionSwitchEstablished,
    FinalisingSwitch,
    FullyConnected,
    Disconnected // From a Terraria Server
}

export default ClientState;