import { EventEmitter } from 'events';
import * as Net from 'net';
import * as winston from 'winston';
import Blacklist from '../../dimensions/blacklist.js';
import BlacklistCheckClient from '../../dimensions/blacklistcheckclient.js';
import ClientArgs from '../../dimensions/clientargs.js';
import RawPacket from '../../dimensions/packets/rawpacket.js';
import { ClientUuidPacket, ConnectRequestPacket, HostTokenPacket, LoadoutSwitchPacket, Parser, PlayerBuffsSetPacket, PlayerHealthPacket, PlayerInfoPacket, PlayerInventorySlotPacket, PlayerManaPacket, WorldDataRequestPacket } from 'terraria-packet';

describe("BlacklistCheckClient", () => {
    const uuid = "29be7f8f-25ae-4c10-9664-6f7c783cba32";

    function unwrapBuffer(result: { TAG: "Ok"; _0: Buffer } | { TAG: "Error"; _0: unknown }): Buffer {
        if (result.TAG === "Error") {
            throw new Error(`Error creating packet: ${String(result._0)}`);
        }

        return result._0;
    }

    function makeSocket(): Net.Socket & { write: jasmine.Spy } {
        const socket = new EventEmitter() as Net.Socket & { write: jasmine.Spy };
        Object.defineProperty(socket, "remoteAddress", {
            value: "127.0.0.1",
            configurable: true
        });
        socket.write = jasmine.createSpy("write");

        return socket;
    }

    function makeClientArgs(socket: Net.Socket): ClientArgs {
        return {
            socket,
            globalHandlers: {
                extensions: {}
            },
            options: {
                log: {
                    extensionError: false
                }
            },
            logging: winston.createLogger({ silent: true })
        } as unknown as ClientArgs;
    }

    function makeBlacklist(isBlacklisted = false): Blacklist & { checkInformation: jasmine.Spy } {
        return {
            checkInformation: jasmine.createSpy("checkInformation").and.returnValue(Promise.resolve(isBlacklisted))
        } as unknown as Blacklist & { checkInformation: jasmine.Spy };
    }

    function makePendingBlacklist(): Blacklist & { checkInformation: jasmine.Spy; resolve: (isBlacklisted: boolean) => void } {
        let resolve!: (isBlacklisted: boolean) => void;
        const promise = new Promise<boolean>((promiseResolve) => {
            resolve = promiseResolve;
        });

        return {
            checkInformation: jasmine.createSpy("checkInformation").and.returnValue(promise),
            resolve
        } as unknown as Blacklist & { checkInformation: jasmine.Spy; resolve: (isBlacklisted: boolean) => void };
    }

    function makeClient(socket = makeSocket(), blacklist = makeBlacklist()) {
        const client = new BlacklistCheckClient({
            blacklist,
            clientArgs: makeClientArgs(socket)
        });
        const accepted: { bufferPacket: Buffer; packetsReceived: RawPacket[] }[] = [];
        const callbacks = {
            clientAcceptedCb: (bufferPacket: Buffer, packetsReceived: RawPacket[]) => {
                accepted.push({ bufferPacket, packetsReceived });
            },
            clientBlacklistedCb: jasmine.createSpy("clientBlacklistedCb"),
            errorCheckingBlacklistCb: jasmine.createSpy("errorCheckingBlacklistCb"),
            packetErrorCheckingBlacklistCb: jasmine.createSpy("packetErrorCheckingBlacklistCb"),
            disconnectCb: jasmine.createSpy("disconnectCb")
        };

        client.setupCallbacks(callbacks);

        return { client, socket, blacklist, callbacks, accepted };
    }

    function connectRequestPacket(): Buffer {
        return unwrapBuffer(ConnectRequestPacket.toBuffer({ version: "Terraria319" }));
    }

    function playerInfoPacket(): Buffer {
        const color = { R: 0, G: 0, B: 0 };
        return unwrapBuffer(PlayerInfoPacket.toBuffer({
            playerId: 0,
            skinVariant: 1,
            voiceVariant: 1,
            voicePitchOffset: 0,
            hair: 1,
            name: "Smekku",
            hairDye: 0,
            hideVisuals: 0,
            hideVisuals2: 0,
            hideMisc: 0,
            hairColor: color,
            skinColor: color,
            eyeColor: color,
            shirtColor: color,
            underShirtColor: color,
            pantsColor: color,
            shoeColor: color,
            difficulty: "Softcore",
            mode: "Classic",
            extraAccessory: false,
            usingBiomeTorches: false,
            unlockedBiomeTorches: false,
            happyFunTorchTime: false,
            unlockedSuperCart: false,
            enabledSuperCart: false,
            usedAegisCrystal: false,
            usedAegisFruit: false,
            usedArcaneCrystal: false,
            usedGalaxyPearl: false,
            usedGummyWorm: false,
            usedAmbrosia: false,
            ateArtisanBread: false
        }));
    }

    function clientUuidPacket(): Buffer {
        return unwrapBuffer(ClientUuidPacket.toBuffer({ uuid }));
    }

    function playerBuffsSetPacket(): Buffer {
        return unwrapBuffer(PlayerBuffsSetPacket.toBuffer({
            playerId: 0,
            buffs: Array(22).fill(0)
        }));
    }

    function playerHealthPacket(): Buffer {
        return unwrapBuffer(PlayerHealthPacket.toBuffer({
            playerId: 0,
            health: 100,
            maxHealth: 100
        }));
    }

    function playerManaPacket(): Buffer {
        return unwrapBuffer(PlayerManaPacket.toBuffer({
            playerId: 0,
            mana: 20,
            maxMana: 20
        }));
    }

    function loadoutSwitchPacket(): Buffer {
        return unwrapBuffer(LoadoutSwitchPacket.toBuffer({
            playerId: 0,
            loadout: 0,
            hideVisibleAccessory: Array(16).fill(false)
        } as LoadoutSwitchPacket.t));
    }

    function playerInventorySlotPacket(): Buffer {
        return unwrapBuffer(PlayerInventorySlotPacket.toBuffer({
            playerId: 0,
            slot: 0,
            stack: 0,
            prefix: 0,
            itemType: 0,
            favorited: false,
            blocked: false
        }));
    }

    function hostTokenPacket(): Buffer {
        return unwrapBuffer(HostTokenPacket.toBuffer({
            token: "host-token"
        }));
    }

    function worldDataRequestPacket(): Buffer {
        return unwrapBuffer(WorldDataRequestPacket.toBuffer(undefined));
    }

    function playerPlatformInfoPacket(): Buffer {
        const packet = Buffer.alloc(5);
        packet.writeUInt16LE(5, 0);
        packet.writeUInt8(163, 2);
        packet.writeUInt8(0, 3);
        packet.writeUInt8(7, 4);
        return packet;
    }

    function oversizedIncompletePacket(): Buffer {
        const packet = Buffer.alloc(4097);
        packet.writeUInt16LE(5000, 0);
        return packet;
    }

    function packetLengthWithoutType(): Buffer {
        const packet = Buffer.alloc(2);
        packet.writeUInt16LE(2, 0);
        return packet;
    }

    function parseServerPacketTag(packet: Buffer): string {
        const parsed = Parser.parse(packet, true);
        if (parsed.TAG === "Error") {
            throw new Error(`Error parsing packet: ${String(parsed._0)}`);
        }

        return parsed._0.TAG;
    }

    function parseClientPacketTag(packet: Buffer): string {
        const parsed = Parser.parse(packet, false);
        if (parsed.TAG === "Error") {
            throw new Error(`Error parsing packet: ${String(parsed._0)}`);
        }

        return parsed._0.TAG;
    }

    it("does not write setup packets before receiving ConnectRequest", () => {
        const { socket } = makeClient();

        expect(socket.write).not.toHaveBeenCalled();
    });

    it("writes status then player slot setup after receiving ConnectRequest", () => {
        const { client, socket } = makeClient();

        client.handleData(connectRequestPacket());

        expect(socket.write).toHaveBeenCalledTimes(2);
        const writes = socket.write.calls.allArgs().map(args => args[0] as Buffer);
        expect(parseServerPacketTag(writes[0])).toBe("Status");
        expect(parseServerPacketTag(writes[1])).toBe("PlayerSlotSet");
    });

    it("accepts clients after ConnectRequest, PlayerInfo, and ClientUuid and replays ConnectRequest first", async () => {
        const { client, blacklist, accepted } = makeClient();

        client.handleData(Buffer.concat([
            connectRequestPacket(),
            playerInfoPacket(),
            clientUuidPacket()
        ]));
        await Promise.resolve();

        expect(blacklist.checkInformation).toHaveBeenCalledOnceWith("Smekku", "127.0.0.1", uuid);
        expect(accepted.length).toBe(1);
        expect(accepted[0].bufferPacket.length).toBe(0);
        expect(accepted[0].packetsReceived.map(packet => parseClientPacketTag(packet.data))).toEqual([
            "ConnectRequest",
            "PlayerInfo",
            "ClientUuid"
        ]);
    });

    it("queues expected join startup packets received while the post-UUID blacklist check is pending", async () => {
        const blacklist = makePendingBlacklist();
        const { client, accepted } = makeClient(makeSocket(), blacklist);

        client.handleData(Buffer.concat([
            connectRequestPacket(),
            playerInfoPacket(),
            clientUuidPacket()
        ]));
        client.handleData(Buffer.concat([
            playerHealthPacket(),
            playerManaPacket(),
            playerBuffsSetPacket(),
            loadoutSwitchPacket(),
            playerInventorySlotPacket(),
            hostTokenPacket(),
            worldDataRequestPacket(),
            playerPlatformInfoPacket()
        ]));
        blacklist.resolve(false);
        await Promise.resolve();

        expect(accepted.length).toBe(1);
        expect(accepted[0].packetsReceived.map(packet => parseClientPacketTag(packet.data))).toEqual([
            "ConnectRequest",
            "PlayerInfo",
            "ClientUuid",
            "PlayerHealth",
            "PlayerMana",
            "PlayerBuffsSet",
            "LoadoutSwitch",
            "PlayerInventorySlot",
            "HostToken",
            "WorldDataRequest",
            "PlayerPlatformInfo"
        ]);
    });

    it("rejects PlayerInfo before ConnectRequest", () => {
        const { client, socket, callbacks } = makeClient();

        client.handleData(playerInfoPacket());

        expect(callbacks.packetErrorCheckingBlacklistCb).toHaveBeenCalledOnceWith(jasmine.any(Error));
        expect(socket.write).not.toHaveBeenCalled();
    });

    it("rejects non-handshake packet spam before blacklist acceptance", async () => {
        const { client, blacklist, callbacks, accepted } = makeClient();
        const spamPackets = Array.from({ length: 1000 }, playerBuffsSetPacket);

        client.handleData(Buffer.concat([
            connectRequestPacket(),
            ...spamPackets
        ]));
        await Promise.resolve();

        expect(callbacks.packetErrorCheckingBlacklistCb).toHaveBeenCalledOnceWith(jasmine.any(Error));
        expect(blacklist.checkInformation).not.toHaveBeenCalled();
        expect(accepted.length).toBe(0);
    });

    it("rejects excessive post-UUID startup packets while blacklist acceptance is pending", async () => {
        const blacklist = makePendingBlacklist();
        const { client, callbacks, accepted } = makeClient(makeSocket(), blacklist);
        const spamPackets = Array.from({ length: 1000 }, playerBuffsSetPacket);

        client.handleData(Buffer.concat([
            connectRequestPacket(),
            playerInfoPacket(),
            clientUuidPacket()
        ]));
        client.handleData(Buffer.concat(spamPackets));
        blacklist.resolve(false);
        await Promise.resolve();

        expect(callbacks.packetErrorCheckingBlacklistCb).toHaveBeenCalledOnceWith(jasmine.any(Error));
        expect(accepted.length).toBe(0);
    });

    it("rejects oversized incomplete pre-auth packet buffers", () => {
        const { client, socket, blacklist, callbacks } = makeClient();

        client.handleData(oversizedIncompletePacket());

        expect(callbacks.packetErrorCheckingBlacklistCb).toHaveBeenCalledOnceWith(jasmine.any(Error));
        expect(blacklist.checkInformation).not.toHaveBeenCalled();
        expect(socket.write).not.toHaveBeenCalled();
    });

    it("rejects a packet length without a packet type", () => {
        const { client, socket, blacklist, callbacks } = makeClient();

        expect(() => client.handleData(packetLengthWithoutType())).not.toThrow();

        expect(callbacks.packetErrorCheckingBlacklistCb).toHaveBeenCalledOnceWith(jasmine.any(Error));
        expect(blacklist.checkInformation).not.toHaveBeenCalled();
        expect(socket.write).not.toHaveBeenCalled();
    });
});
