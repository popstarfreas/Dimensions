enum ClientState {
    FreshConnection = 0,
    FinishinedSendingInventory,
    ConnectionSwitchEstablished,
    FinalisingSwitch,
    FullyConnected
}

export default ClientState;