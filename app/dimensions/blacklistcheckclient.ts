import ClientArgs from './clientargs.js';
import RawPacket from './packets/rawpacket.js';
import { getPacketsFromBuffer, BuffersPackets } from './utils.js';
import { getProperIP } from './utils.js';
import Blacklist from './blacklist.js';
import { Parser, PlayerSlotSetPacket } from 'terraria-packet';
import { BlacklistCheckContext, BlacklistCheckState, RawSocketWriteContext, RawSocketWriteReason } from './extension/index.js';
import ErrorHelper from './errorhelper.js';

enum ClientState {
    StartOfConnection,
    AssignedClientId,
    SentPlayerInfo,
    SentUuid,
}

interface BlacklistCheckClientArgs {
    blacklist: Blacklist,
    clientArgs: ClientArgs,
}

interface BlacklistCheckCallbackArgs {
    clientAcceptedCb: (bufferPacket: Buffer, packetsReceived: RawPacket[]) => void,
    clientBlacklistedCb: () => void
    errorCheckingBlacklistCb: (bufferPacket: Buffer, packetsReceived: RawPacket[], e: Error) => void
    packetErrorCheckingBlacklistCb: (e: Error) => void
    disconnectCb: () => void
}

class BlacklistCheckClient {
    private state: ClientState = ClientState.StartOfConnection;
    private name: string | undefined;
    private bufferPacket: Buffer = Buffer.alloc(0);
    private packetsReceived: RawPacket[] = [];
    private clientAcceptedCb!: (bufferPacket: Buffer, packetsReceived: RawPacket[]) => void;
    private clientBlacklistedCb!: () => void;
    private errorCheckingBlacklistCb!: (bufferPacket: Buffer, packetsReceived: RawPacket[], e: Error) => void;
    private packetErrorCheckingBlacklistCb!: (e: Error) => void;
    private disposed: boolean = false;

    constructor(private settings: BlacklistCheckClientArgs) {
        this.state = ClientState.AssignedClientId;
    }

    setupCallbacks(args: BlacklistCheckCallbackArgs) {
        this.clientAcceptedCb = args.clientAcceptedCb;
        this.clientBlacklistedCb = args.clientBlacklistedCb;
        this.errorCheckingBlacklistCb = args.errorCheckingBlacklistCb;
        this.packetErrorCheckingBlacklistCb = args.packetErrorCheckingBlacklistCb;

        this.settings.clientArgs.socket.on('data', this.handleData.bind(this));
        this.settings.clientArgs.socket.on('error', this.handleError.bind(this));
        this.settings.clientArgs.socket.on('timeout', this.handleTimeout.bind(this));
        this.settings.clientArgs.socket.on('close', () => {
            if (this.disposed) {
                return;
            }
            args.disconnectCb();
            this.dispose()
        })
        const playerSlotSetPacket = PlayerSlotSetPacket.toBuffer({
            playerSlotId: 0,
            serverWantsToRunCheckBytesInClientLoopThread: true,
        });
        if (playerSlotSetPacket.TAG === "Error") {
            this.settings.clientArgs.logging.error(`Error creating player slot set packet: ${playerSlotSetPacket._0}`);
            return;
        }
        this.writeToSocket(playerSlotSetPacket._0, RawSocketWriteReason.BlacklistCheckClientSetup);
    }

    handleData(data: Buffer) {
        let bufferPacket = this.bufferPacket;
        let entireData = Buffer.concat([bufferPacket, data]);

        // Get the individual packets from the data
        let entireDataInfo: BuffersPackets = getPacketsFromBuffer(entireData);

        if (entireDataInfo.type === "InvalidPacketLength") {
            this.dispose()
            this.packetErrorCheckingBlacklistCb(new Error(`Invalid packet length ${entireDataInfo.length}`))
            return
        }

        // Update Buffer Packet using the new incomplete packet (if any)
        this.bufferPacket = entireDataInfo.bufferPacket;

        const packets: RawPacket[] = entireDataInfo.packets;
        this.packetsReceived.push(...packets);

        for (const packet of packets) {
            this.handlePacket(packet);
        }
    }

    handlePacket(rawPacket: RawPacket) {
        if (this.disposed) {
            return
        }

        // Run pre-handlers
        if (this.runPreHandlers(rawPacket)) {
            return;
        }

        const packetResult = Parser.parseLazy(rawPacket.data, false)
        if (packetResult.TAG === "Error") {
            // I saw mobile send this and do not know why
            if (rawPacket.packetType == 163) {
                return
            }
            this.dispose()
            this.packetErrorCheckingBlacklistCb(new Error(`Error parsing packet: ${packetResult._0}`))
            return
        }
        const packet = packetResult._0;

        switch (packet.TAG) {
            case "PlayerInfo":
                if (this.state !== ClientState.AssignedClientId) {
                    this.dispose()
                    this.packetErrorCheckingBlacklistCb(new Error("Client info packet received before assigning client ID"))
                    return
                }
                const playerInfoResult = packet._0.VAL();
                if (playerInfoResult.TAG === "Error") {
                    this.dispose()
                    this.packetErrorCheckingBlacklistCb(new Error("Client info packet could not be parsed. Error: " + playerInfoResult._0.context))
                    return
                }
                const playerInfo = playerInfoResult._0;

                this.name = playerInfo.name;
                this.state = ClientState.SentPlayerInfo;
                break;
            case "ClientUuid":
                if (this.state !== ClientState.SentPlayerInfo) {
                    this.dispose()
                    this.packetErrorCheckingBlacklistCb(new Error("Client UUID packet received before player info"))
                    return
                }
                const clientUuidResult = packet._0.VAL();
                const ip = getProperIP(this.settings.clientArgs.socket.remoteAddress);
                if (clientUuidResult.TAG === "Error") {
                    this.dispose()
                    this.packetErrorCheckingBlacklistCb(new Error("Client UUID packet could not be parsed. Error: " + clientUuidResult._0.context))
                    return
                }
                const clientUuid = clientUuidResult._0;
                if (this.name === undefined) {
                    this.dispose()
                    this.packetErrorCheckingBlacklistCb(new Error("Client name missing"))
                    return
                }
                if (ip === undefined) {
                    this.dispose()
                    this.packetErrorCheckingBlacklistCb(new Error("Client IP could not be parsed"))
                    return
                }
                this.state = ClientState.SentUuid;

                this.settings.blacklist.checkInformation(this.name, ip, clientUuid.uuid).then((isBlacklisted) => {
                    if (this.disposed) {
                        return;
                    }
                    this.dispose()
                    if (isBlacklisted) {
                        this.clientBlacklistedCb();
                    } else {
                        this.clientAcceptedCb(this.bufferPacket, this.packetsReceived);
                    }
                }).catch((e) => {
                    if (this.disposed) {
                        return;
                    }
                    this.dispose()
                    this.errorCheckingBlacklistCb(this.bufferPacket, this.packetsReceived, e)
                })
                break;
        }

        // Run post-handlers
        this.runPostHandlers(rawPacket);
    }

    handleError(err: Error) {
        console.error("Error with client", err);
    }
    handleTimeout() {
        console.error("Client timed out");
    }

    dispose() {
        this.settings.clientArgs.socket.removeAllListeners();
        this.disposed = true;
    }

    private getHookContext(): BlacklistCheckContext {
        let stateString: BlacklistCheckState;
        switch (this.state) {
            case ClientState.SentPlayerInfo:
                stateString = BlacklistCheckState.SentPlayerInfo;
                break;
            case ClientState.SentUuid:
                stateString = BlacklistCheckState.SentUuid;
                break;
            default:
                stateString = BlacklistCheckState.AssignedClientId;
        }
        return {
            socket: this.settings.clientArgs.socket,
            clientArgs: this.settings.clientArgs,
            state: stateString
        };
    }

    private runPreHandlers(packet: RawPacket): boolean {
        const extensions = this.settings.clientArgs.globalHandlers.extensions;
        const context = this.getHookContext();

        for (const key in extensions) {
            const extension = extensions[key];
            if (extension.blacklistCheckPacketPreHandler) {
                try {
                    const handled = extension.blacklistCheckPacketPreHandler(context, packet);
                    if (handled) {
                        return true;
                    }
                } catch (error) {
                    if (this.settings.clientArgs.options.log.extensionError) {
                        const name = extension.name ?? key;
                        const logMessage = `[${process.pid}] Extension ${name} BlacklistCheck Pre Handler Error: ${ErrorHelper.toMessage(error)}`;
                        this.settings.clientArgs.logging.info(logMessage);
                    }
                }
            }
        }

        return false;
    }

    private runPostHandlers(packet: RawPacket): boolean {
        const extensions = this.settings.clientArgs.globalHandlers.extensions;
        const context = this.getHookContext();

        for (const key in extensions) {
            const extension = extensions[key];
            if (extension.blacklistCheckPacketPostHandler) {
                try {
                    const handled = extension.blacklistCheckPacketPostHandler(context, packet);
                    if (handled) {
                        return true;
                    }
                } catch (error) {
                    if (this.settings.clientArgs.options.log.extensionError) {
                        const name = extension.name ?? key;
                        const logMessage = `[${process.pid}] Extension ${name} BlacklistCheck Post Handler Error: ${ErrorHelper.toMessage(error)}`;
                        this.settings.clientArgs.logging.info(logMessage);
                    }
                }
            }
        }

        return false;
    }

    private writeToSocket(packet: Buffer, reason: RawSocketWriteContext['reason']): void {
        const extensions = this.settings.clientArgs.globalHandlers.extensions;
        const context: RawSocketWriteContext = {
            socket: this.settings.clientArgs.socket,
            remoteAddress: this.settings.clientArgs.socket.remoteAddress,
            reason: reason,
            clientArgs: this.settings.clientArgs
        };
        const packetWrapper = { packet: packet };

        // Run pre-handlers
        for (const key in extensions) {
            const extension = extensions[key];
            if (extension.rawSocketWritePreHandler) {
                try {
                    const blocked = extension.rawSocketWritePreHandler(context, packetWrapper);
                    if (blocked) {
                        return;
                    }
                } catch (error) {
                    if (this.settings.clientArgs.options.log.extensionError) {
                        const name = extension.name ?? key;
                        const logMessage = `[${process.pid}] Extension ${name} RawSocketWrite Pre Handler Error: ${ErrorHelper.toMessage(error)}`;
                        this.settings.clientArgs.logging.info(logMessage);
                    }
                }
            }
        }

        // Perform the write
        this.settings.clientArgs.socket.write(packetWrapper.packet);

        // Run post-handlers
        for (const key in extensions) {
            const extension = extensions[key];
            if (extension.rawSocketWritePostHandler) {
                try {
                    extension.rawSocketWritePostHandler(context, packetWrapper);
                } catch (error) {
                    if (this.settings.clientArgs.options.log.extensionError) {
                        const name = extension.name ?? key;
                        const logMessage = `[${process.pid}] Extension ${name} RawSocketWrite Post Handler Error: ${ErrorHelper.toMessage(error)}`;
                        this.settings.clientArgs.logging.info(logMessage);
                    }
                }
            }
        }
    }
}

export default BlacklistCheckClient;
