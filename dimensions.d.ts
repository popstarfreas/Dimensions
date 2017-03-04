declare module 'dimensions/node_modules/dimensions/routingserver' {
	interface RoutingServer {
	    name: string;
	    serverIP: string;
	    serverPort: number;
	}
	export default RoutingServer;

}
declare module 'dimensions/node_modules/dimensions/color' {
	interface Color {
	    R: number;
	    G: number;
	    B: number;
	}
	export default Color;

}
declare module 'dimensions/node_modules/dimensions/packet' {
	interface Packet {
	    packetType: number;
	    data: string;
	}
	export default Packet;

}
declare module 'dimensions/node_modules/dimensions/utils' {
	/// <reference types="node" />
	import Packet from 'dimensions/packet';
	export interface BuffersPackets {
	    bufferPacket: string;
	    packets: Packet[];
	}
	export function hex2a(hexx: string): string;
	export function a2hex(str: string): string;
	export function str2Hex(str: string): Buffer;
	export function hex2str(hex: Buffer): string;
	export function getProperIP(ip: string): string;
	export function getPacketLengthFromData(hexStr: string): string;
	export function getPacketTypeFromHexString(str: string): number;
	export function getPacketsFromHexString(str: string): BuffersPackets;
	export function getCorrectHex(hexString: string): string;
	export function _invalidateRequireCacheForFile(filePath: string, require: NodeRequire): void;
	export function requireNoCache(filePath: string, require: any): any;

}
declare module 'dimensions/node_modules/dimensions/item' {
	 class Item {
	    slot: number;
	    stack: number;
	    prefix: number;
	    netID: number;
	    constructor(slot: number, stack: number, prefix: number, netID: number);
	}
	export default Item;

}
declare module 'dimensions/node_modules/dimensions/packets/hexwriter' {
	import Color from 'dimensions/color'; class HexWriter {
	    protected _data: string;
	    constructor();
	    packString(str: string): HexWriter;
	    packHex(hex: string): HexWriter;
	    packByte(byte: number): HexWriter;
	    packColor(color: Color): HexWriter;
	    packInt16(int16: number): HexWriter;
	    packInt32(int32: number): HexWriter;
	    packSingle(float: number): HexWriter;
	    readonly data: string;
	}
	export default HexWriter;

}
declare module 'dimensions/node_modules/dimensions/packets/packetwriter' {
	import HexWriter from 'dimensions/packets/hexwriter';
	import Color from 'dimensions/color'; class PacketWriter extends HexWriter {
	    constructor();
	    setType(type: number): PacketWriter;
	    packString(str: string): PacketWriter;
	    packHex(hex: string): PacketWriter;
	    packByte(byte: number): PacketWriter;
	    packColor(color: Color): PacketWriter;
	    packInt16(int16: number): PacketWriter;
	    packInt32(int32: number): PacketWriter;
	    packSingle(float: number): PacketWriter;
	    protected updateLength(): void;
	}
	export default PacketWriter;

}
declare module 'dimensions/node_modules/dimensions/packettypes' {
	 enum PacketTypes {
	    ConnectRequest = 1,
	    Disconnect = 2,
	    ContinueConnecting = 3,
	    PlayerInfo = 4,
	    PlayerInventorySlot = 5,
	    ContinueConnecting2 = 6,
	    WorldInfo = 7,
	    GetSectionOrRequestSync = 8,
	    Status = 9,
	    SendSection = 10,
	    SectionTileFrame = 11,
	    SpawnPlayer = 12,
	    UpdatePlayer = 13,
	    PlayerActive = 14,
	    Null = 15,
	    PlayerHP = 16,
	    ModifyTile = 17,
	    Time = 18,
	    DoorToggle = 19,
	    SendTileSquare = 20,
	    UpdateItemDrop = 21,
	    UpdateItemOwner = 22,
	    NPCUpdate = 23,
	    StrikeNPCwithHeldItem = 24,
	    ChatMessage = 25,
	    PlayerDamage = 26,
	    ProjectileUpdate = 27,
	    NPCStrike = 28,
	    DestroyProjectile = 29,
	    TogglePVP = 30,
	    GetChestContentsOrActiveChest = 31,
	    ChestItem = 32,
	    SetChestNameOrOpenChest = 33,
	    PlaceOrKillChest = 34,
	    HealEffect = 35,
	    PlayerZone = 36,
	    RequestPassword = 37,
	    SendPassword = 38,
	    RemoveItemOwner = 39,
	    SetActiveNPC = 40,
	    PlayerItemAnimation = 41,
	    PlayerMana = 42,
	    ManaEffect = 43,
	    KillMe = 44,
	    PlayerTeam = 45,
	    RequestSign = 46,
	    UpdateOrDisplaySign = 47,
	    SetLiquid = 48,
	    CompleteConnectionAndSpawn = 49,
	    UpdatePlayerBuff = 50,
	    SpecialNPCEffect = 51,
	    Unlock = 52,
	    AddNPCBuff = 53,
	    UpdateNPCBuff = 54,
	    AddPlayerBuff = 55,
	    UpdateNPCName = 56,
	    UpdateGoodOrEvil = 57,
	    PlayMusicItem = 58,
	    HitSwitch = 59,
	    NPCHomeUpdate = 60,
	    SpawnBossOrInvasion = 61,
	    PlayerDodge = 62,
	    PaintTile = 63,
	    PaintWall = 64,
	    PlayerOrNPCTeleport = 65,
	    HealOtherPlayer = 66,
	    DimensionsUpdate = 67,
	    ClientUUID = 68,
	    GetChestName = 69,
	    CatchNPC_bugs = 70,
	    ReleaseNPC = 71,
	    TravellingMerchantInventory = 72,
	    TeleportationPotion = 73,
	    AnglerQuest = 74,
	    CompleteAnglerquesttoday = 75,
	    NumberOfAnglerQuestsCompleted = 76,
	    CreateTemporaryAnimation = 77,
	    ReportInvasionProgress = 78,
	    PlaceObject = 79,
	    SyncPlayerChestIndex = 80,
	    CreateCombatText = 81,
	    LoadNetModule = 82,
	    SetNPCKillCount = 83,
	    SetPlayerStealth = 84,
	    ForceItemIntoNearestChest = 85,
	    UpdateTileEntity = 86,
	    PlaceTileEntity = 87,
	    AlterItemDrop = 88,
	    PlaceItemFrame = 89,
	    UpdateItemDrop_Instanced = 90,
	    SyncEmoteBubble = 91,
	    SyncExtraValue = 92,
	    SocialHandshake = 93,
	    Deprecated = 94,
	    KillPortal = 95,
	    PlayerTeleportThroughPortal = 96,
	    NotifyPlayerNPCKilled = 97,
	    NotifyPlayerOfEvent = 98,
	    UpdateMinionTarget = 99,
	    NPCTeleportThroughPortal = 100,
	    UpdateShieldStrengths = 101,
	    NebulaLevelUpRequest = 102,
	    UpdateMoonLordCountdown = 103,
	    SetNPCShopItem = 104,
	    ToggleGemLock = 105,
	    PoofofSmoke = 106,
	    SmartChatMessage = 107,
	    WiredCannonShot = 108,
	    MassWireOperation = 109,
	    MassWireOperationConsume = 110,
	    ToggleBirthdayParty = 111,
	    GrowFX = 112,
	    CrystalInvasionStart = 113,
	    CrystalInvasionWipeAll = 114,
	    MinionAttackTargetUpdate = 115,
	    CrystalInvasionSendWaitTime = 116,
	    PlayerHurtV2 = 117,
	    PlayerDeathV2 = 118,
	}
	export default PacketTypes;

}
declare module 'dimensions/node_modules/dimensions/player' {
	import Item from 'dimensions/item';
	import Client from 'dimensions/client';
	import Color from 'dimensions/color'; class Player {
	    client: Client | null;
	    id: number;
	    name: string;
	    inventory: Item[];
	    life: number;
	    mana: number;
	    allowedNameChange: boolean;
	    allowedCharacterChange: boolean;
	    allowedLifeChange: boolean;
	    allowedManaChange: boolean;
	    skinVariant: number;
	    hair: number;
	    hairDye: number;
	    hideVisuals: number;
	    hideVisuals2: number;
	    hideMisc: number;
	    hairColor: Color;
	    skinColor: Color;
	    eyeColor: Color;
	    shirtColor: Color;
	    underShirtColor: Color;
	    pantsColor: Color;
	    shoeColor: Color;
	    difficulty: number;
	    constructor(client: Client | null);
	    setItem(item: Item): void;
	    setLife(life: number): void;
	    setMana(mana: number): void;
	    setVisuals(): void;
	}
	export default Player;

}
declare module 'dimensions/node_modules/dimensions/packets/hexreader' {
	import Color from 'dimensions/color'; class HexReader {
	    protected _data: string;
	    constructor(data: string);
	    readonly data: string;
	    readByte(): number;
	    readColor(): Color;
	    readSByte(): number;
	    readInt16(): number;
	    readUInt16(): number;
	    readInt32(): number;
	    readUInt32(): number;
	    readSingle(): number;
	    readString(): string;
	}
	export default HexReader;

}
declare module 'dimensions/node_modules/dimensions/packets/packetreader' {
	import HexReader from 'dimensions/packets/hexreader'; class PacketReader extends HexReader {
	    protected _type: number;
	    constructor(data: string);
	    readonly type: number;
	}
	export default PacketReader;

}
declare module 'dimensions/node_modules/dimensions/npc' {
	 class NPC {
	    index: number;
	    type: number;
	    life: number;
	    constructor(index: number, type: number, life: number);
	}
	export default NPC;

}
declare module 'dimensions/node_modules/dimensions/point' {
	interface Point {
	    x: number;
	    y: number;
	}
	export default Point;

}
declare module 'dimensions/node_modules/dimensions/clientstates' {
	 enum ClientState {
	    FreshConnection = 0,
	    FinishinedSendingInventory = 1,
	    ConnectionSwitchEstablished = 2,
	    FinalisingSwitch = 3,
	    FullyConnected = 4,
	}
	export default ClientState;

}
declare module 'dimensions/node_modules/dimensions/terrariaserverpackethandler' {
	/// <reference types="node" />
	import TerrariaServer from 'dimensions/terrariaserver';
	import Client from 'dimensions/client';
	import Packet from 'dimensions/packet';
	import * as Net from 'net'; class TerrariaServerPacketHandler {
	    currentServer: TerrariaServer;
	    socket: Net.Socket;
	    runPriorHandlers(server: TerrariaServer, packet: Packet): boolean;
	    runPostHandlers(server: TerrariaServer, packet: Packet): boolean;
	    handlePacket(server: TerrariaServer, packet: Packet): string;
	    handleDisconnect(packet: Packet): boolean;
	    handleContinueConnecting(packet: Packet): boolean;
	    handleWorldInfo(packet: Packet): boolean;
	    handleCompleteConnectionAndSpawn(packet: Packet): boolean;
	    handleDimensionsUpdate(packet: Packet): boolean;
	    handleNPCUpdate(packet: Packet): boolean;
	    handleUpdateItemDrop(packet: Packet): boolean;
	    handlePlayerActive(packet: Packet): boolean;
	    clearPlayers(client: Client): void;
	    clearPlayer(client: Client, playerIndex: number): void;
	    clearNPCs(client: Client): void;
	    clearNPC(client: Client, npcIndex: number): void;
	    clearItems(client: Client): void;
	    clearItem(client: Client, itemIndex: number): void;
	    restoreInventory(client: Client): void;
	    restoreLife(client: Client): void;
	    restoreMana(client: Client): void;
	    restoreVisuals(client: Client): void;
	}
	export default TerrariaServerPacketHandler;

}
declare module 'dimensions/node_modules/dimensions/entities' {
	import Item from 'dimensions/item';
	import NPC from 'dimensions/npc';
	import Player from 'dimensions/player';
	interface Entities {
	    items: (Item | undefined)[];
	    NPCs: (NPC | undefined)[];
	    players: (Player | undefined)[];
	}
	export default Entities;

}
declare module 'dimensions/node_modules/dimensions/terrariaserver' {
	/// <reference types="node" />
	import terrariaServerPacketHandler from 'dimensions/terrariaserverpackethandler';
	import Client from 'dimensions/client';
	import * as Net from 'net';
	import Point from 'dimensions/point';
	import Entities from 'dimensions/entities'; class TerrariaServer {
	    client: Client;
	    socket: Net.Socket;
	    ip: string;
	    port: number;
	    name: string;
	    spawn: Point;
	    bufferPacket: string;
	    afterClosed: ((client: Client) => void) | null;
	    entityTracking: Entities;
	    isSSC: boolean;
	    constructor(socket: Net.Socket, client: Client);
	    reset(): void;
	    getPacketHandler(): terrariaServerPacketHandler;
	    handleData(encodedData: Buffer): void;
	    handledByPreCloseHandlers(): boolean;
	    handledByCloseHandlers(): boolean;
	    handleClose(): void;
	    handleError(error: Error): void;
	}
	export default TerrariaServer;

}
declare module 'dimensions/node_modules/dimensions/configloader' {
	import RoutingServer from 'dimensions/routingserver';
	export interface ConfigServer {
	    listenPort: number;
	    routingServers: RoutingServer[];
	}
	export interface LogOptions {
	    clientTimeouts: boolean;
	    clientConnect: boolean;
	    clientDisconnect: boolean;
	    clientError: boolean;
	    tServerConnect: boolean;
	    tServerDisconnect: boolean;
	    tServerError: boolean;
	    clientBlocked: boolean;
	    extensionLoad: boolean;
	    outputToConsole: boolean;
	}
	export interface FakeVersion {
	    enabled: boolean;
	    terrariaVersion: number;
	}
	export interface BlackList {
	    enabled: boolean;
	    apiKey: string;
	}
	export interface RestApi {
	    enabled: boolean;
	    port: number;
	}
	export interface ConfigOptions {
	    socketTimeout: number;
	    currentTerrariaVersion: number;
	    fakeVersion: FakeVersion;
	    restApi: RestApi;
	    blockInvis: boolean;
	    blacklist: BlackList;
	    log: LogOptions;
	}
	export interface Config {
	    servers: ConfigServer[];
	    options: ConfigOptions;
	}
	export const ConfigSettings: Config;

}
declare module 'dimensions/node_modules/dimensions/routinginformation' {
	interface RoutingInformation {
	    type: number;
	    info: string;
	}
	export default RoutingInformation;

}
declare module 'dimensions/node_modules/dimensions/clientcommandhandler' {
	import Client from 'dimensions/client';
	export interface Command {
	    name: string;
	    args: string[];
	}
	export class ClientCommandHandler {
	    parseCommand(message: string): Command;
	    handle(command: Command, client: Client): boolean;
	    clearPlayers(client: Client): void;
	    clearPlayer(client: Client, playerIndex: number): void;
	    clearNPCs(client: Client): void;
	    clearNPC(client: Client, npcIndex: number): void;
	    clearItems(client: Client): void;
	    clearItem(client: Client, itemIndex: number): void;
	    handleWho(args: string[], client: Client): boolean;
	    handleDimensions(args: string[], client: Client): boolean;
	    handleVoid(args: string[], client: Client): boolean;
	}
	export default ClientCommandHandler;

}
declare module 'dimensions/node_modules/dimensions/extension/clientpackethandler' {
	import Client from 'dimensions/client';
	import Packet from 'dimensions/packet'; class ClientPacketHandler {
	    protected currentClient: Client | null;
	    constructor();
	    handlePacket(client: Client, packet: Packet): boolean;
	}
	export default ClientPacketHandler;

}
declare module 'dimensions/node_modules/dimensions/extension/terrariaserverpackethandler' {
	import TerrariaServer from 'dimensions/terrariaserver';
	import Packet from 'dimensions/packet'; class TerrariaServerPacketHandler {
	    protected currentServer: TerrariaServer | null;
	    constructor();
	    handlePacket(server: TerrariaServer, packet: Packet): boolean;
	}
	export default TerrariaServerPacketHandler;

}
declare module 'dimensions/node_modules/dimensions/extension/index' {
	import Client from 'dimensions/client';
	import TerrariaServer from 'dimensions/terrariaserver';
	import ClientPacketHandler from 'dimensions/extension/clientpackethandler';
	import TerrariaServerPacketHandler from 'dimensions/extension/terrariaserverpackethandler';
	export interface PacketHandler {
	    clientHandler?: ClientPacketHandler;
	    serverHandler?: TerrariaServerPacketHandler;
	}
	export type ClientErrorHandler = (client: Client, error: Error) => boolean;
	export type ServerErrorHandler = (server: TerrariaServer, error: Error) => boolean;
	export type ClientDisconnectHandler = (client: Client) => boolean;
	export type ServerDisconnectHandler = (server: TerrariaServer) => boolean;
	export interface Extension {
	    name: string;
	    version: string;
	    author: string;
	    reloadable: boolean;
	    reloadName?: string;
	    reload?: (require: any) => void;
	    priorPacketHandlers?: PacketHandler;
	    postPacketHandlers?: PacketHandler;
	    clientErrorHandler?: ClientErrorHandler;
	    serverErrorHandler?: ServerErrorHandler;
	    clientDisconnectPreHandler?: ClientDisconnectHandler;
	    clientDisconnectHandler?: ClientDisconnectHandler;
	    serverDisconnectPreHandler?: ServerDisconnectHandler;
	    serverDisconnectHandler?: ServerDisconnectHandler;
	}
	export default Extension;

}
declare module 'dimensions/node_modules/dimensions/clientpackethandler' {
	import Client from 'dimensions/client';
	import Packet from 'dimensions/packet'; class ClientPacketHandler {
	    currentClient: Client;
	    runPriorHandlers(client: Client, packet: Packet): boolean;
	    runPostHandlers(client: Client, packet: Packet): boolean;
	    handlePacket(client: Client, packet: Packet): string;
	    handlePlayerInfo(packet: Packet): boolean;
	    handleUpdatePlayerBuff(packet: Packet): boolean;
	    handleAddPlayerBuff(packet: Packet): boolean;
	    handlePlayerInventorySlot(packet: Packet): boolean;
	    handlePlayerMana(packet: Packet): boolean;
	    handlePlayerHP(packet: Packet): boolean;
	    handleUpdateItemDrop(packet: Packet): boolean;
	    handleUpdateItemOwner(packet: Packet): boolean;
	    handleSpawnPlayer(packet: Packet): boolean;
	    handleChatMessage(packet: Packet): boolean;
	    handleClientUUID(packet: Packet): boolean;
	}
	export default ClientPacketHandler;

}
declare module 'dimensions/node_modules/dimensions/globalhandlers' {
	import ClientCommandHandler from 'dimensions/clientcommandhandler';
	import ClientPacketHandler from 'dimensions/clientpackethandler';
	import TerrariaServerPacketHandler from 'dimensions/terrariaserverpackethandler';
	import Extension from 'dimensions/extension';
	interface GlobalHandlers {
	    command: ClientCommandHandler;
	    clientPacketHandler: ClientPacketHandler;
	    terrariaServerPacketHandler: TerrariaServerPacketHandler;
	    extensions: Extension[];
	}
	export default GlobalHandlers;

}
declare module 'dimensions/node_modules/dimensions/serverdetails' {
	/// <reference types="node" />
	interface ServerDetails {
	    clientCount: number;
	    disabled: boolean;
	    disabledTimeout: NodeJS.Timer | null;
	    failedConnAttempts: number;
	}
	export default ServerDetails;

}
declare module 'dimensions/node_modules/dimensions/changeserveroptions' {
	import RoutingInformation from 'dimensions/routinginformation';
	interface ChangeServerOptions {
	    preventSpawnOnJoin?: boolean;
	    routingInformation?: RoutingInformation;
	}
	export default ChangeServerOptions;

}
declare module 'dimensions/node_modules/dimensions/globaltracking' {
	interface GlobalTracking {
	    names: {
	        [name: string]: boolean;
	    };
	}
	export default GlobalTracking;

}
declare module 'dimensions/node_modules/dimensions/logger' {
	 class Logger {
	    fileName: string;
	    constructor(fileName?: string);
	    appendLine(line: string): void;
	    setFileNameToDate(): void;
	    ensureDoubleDigit(displayNumber: string): string;
	}
	export default Logger;

}
declare module 'dimensions/node_modules/dimensions/client' {
	/// <reference types="node" />
	import Player from 'dimensions/player';
	import TerrariaServer from 'dimensions/terrariaserver';
	import * as Net from 'net';
	import { ConfigOptions } from 'dimensions/configloader';
	import ClientPacketHandler from 'dimensions/clientpackethandler';
	import RoutingServer from 'dimensions/routingserver';
	import GlobalHandlers from 'dimensions/globalhandlers';
	import ServerDetails from 'dimensions/serverdetails';
	import RoutingInformation from 'dimensions/routinginformation';
	import ChangeServerOptions from 'dimensions/changeserveroptions';
	import GlobalTracking from 'dimensions/globaltracking';
	import ClientStates from 'dimensions/clientstates';
	import Logger from 'dimensions/logger'; class Client {
	    ID: number;
	    options: ConfigOptions;
	    servers: {
	        [id: string]: RoutingServer;
	    };
	    socket: Net.Socket;
	    ip: string;
	    player: Player;
	    globalHandlers: GlobalHandlers;
	    server: TerrariaServer;
	    connected: boolean;
	    state: ClientStates;
	    bufferPacket: string;
	    initialConnectionAlreadyCreated: boolean;
	    ingame: boolean;
	    UUID: string;
	    waitingCharacterRestore: boolean;
	    wasKicked: boolean;
	    routingInformation: RoutingInformation | null;
	    countIncremented: boolean;
	    serversDetails: {
	        [id: string]: ServerDetails;
	    };
	    preventSpawnOnJoin: boolean;
	    ServerHandleError: (error: Error) => void;
	    ServerHandleData: (data: Buffer) => void;
	    ServerHandleClose: () => void;
	    globalTracking: GlobalTracking;
	    packetQueue: string;
	    logging: Logger;
	    constructor(id: number, socket: Net.Socket, server: RoutingServer, serversDetails: {
	        [id: string]: ServerDetails;
	    }, globalHandlers: GlobalHandlers, servers: {
	        [id: string]: RoutingServer;
	    }, options: ConfigOptions, globalTracking: GlobalTracking, logging: Logger);
	    getPacketHandler(): ClientPacketHandler;
	    setName(name: string): void;
	    getName(): string;
	    handleDataSend(encodedData: Buffer): void;
	    sendChatMessage(message: string, color?: string | undefined): void;
	    sendWaitingPackets(): void;
	    changeServer(server: RoutingServer, options?: ChangeServerOptions): void;
	    handleError(err: Error): void;
	    handleClose(): void;
	}
	export default Client;

}
declare module 'dimensions/node_modules/dimensions/blacklist' {
	export interface BlackListCache {
	    isHostIP: boolean;
	    expires: number;
	} class Blacklist {
	    static cache: Array<BlackListCache>;
	    static checkIP(ip: string, key: string): Promise<boolean>;
	    static parseResponse(ip: string, data: string, resolve: (value?: boolean) => void, reject: (error: Error | string) => void): void;
	}
	export default Blacklist;

}
declare module 'dimensions/node_modules/dimensions/listenserver' {
	/// <reference types="node" />
	import * as Net from 'net';
	import Client from 'dimensions/client';
	import ServerDetails from 'dimensions/serverdetails';
	import GlobalHandlers from 'dimensions/globalhandlers';
	import { ConfigServer, ConfigOptions } from 'dimensions/configloader';
	import RoutingServer from 'dimensions/routingserver';
	import GlobalTracking from 'dimensions/globaltracking';
	import Logger from 'dimensions/logger'; class ListenServer {
	    idCounter: number;
	    clients: Client[];
	    servers: {
	        [id: string]: RoutingServer;
	    };
	    options: ConfigOptions;
	    port: number;
	    routingServers: RoutingServer[];
	    serversDetails: {
	        [id: string]: ServerDetails;
	    };
	    globalHandlers: GlobalHandlers;
	    ServerHandleError: (error: Error) => void;
	    ServerHandleSocket: (socket: Net.Socket) => void;
	    ServerHandleStart: () => void;
	    server: Net.Server;
	    globalTracking: GlobalTracking;
	    logging: Logger;
	    constructor(info: ConfigServer, serversDetails: {
	        [id: string]: ServerDetails;
	    }, globalHandlers: GlobalHandlers, servers: {
	        [id: string]: RoutingServer;
	    }, options: ConfigOptions, globalTracking: GlobalTracking, logging: Logger);
	    chooseServer(): RoutingServer | null;
	    updateInfo(info: ConfigServer): void;
	    shutdown(): void;
	    handleStart(): void;
	    handleSocket(socket: Net.Socket): Promise<void>;
	    setupNewSocket(socket: Net.Socket): Promise<void>;
	    checkBlackList(socket: Net.Socket): Promise<boolean>;
	    sendCheckingIp(socket: Net.Socket): void;
	    hookSocketError(socket: Net.Socket, client: Client): void;
	    hookSocketTimeout(socket: Net.Socket, client: Client): void;
	    hookSocketClose(socket: Net.Socket, client: Client): void;
	    hookSocketData(socket: Net.Socket, client: Client): void;
	    handleError(error: Error): void;
	}
	export default ListenServer;

}
declare module 'dimensions/node_modules/dimensions/reloadtask' {
	interface ReloadTask {
	    key: number;
	    index: number;
	}
	export default ReloadTask;

}
declare module 'dimensions/node_modules/dimensions/extensions' {
	import Logger from 'dimensions/logger';
	import { LogOptions } from 'dimensions/configloader';
	import Extension from 'dimensions/extension'; class Extensions {
	    static folder: string;
	    static loadExtensions(extensionsList: Array<Extension>, options: LogOptions, logging: Logger): void;
	}
	export default Extensions;

}
declare module 'dimensions/node_modules/dimensions/restapi' {
	/// <reference types="node" />
	import * as Net from 'net';
	import GlobalTracking from 'dimensions/globaltracking';
	import ServerDetails from 'dimensions/serverdetails';
	import RoutingServer from 'dimensions/routingserver';
	export interface TshockVersion {
	    Major: number;
	    Minor: number;
	    Build: number;
	    Revision: number;
	    MajorRevision: number;
	    MinorRevision: number;
	}
	export interface ApiResponse {
	    status: number;
	    name: string;
	    serverversion: string;
	    tshockversion: TshockVersion;
	    port: number;
	    playercount: number;
	    maxplayers: number;
	    world: string;
	    uptime: string;
	    serverpassword: boolean;
	    players: Array<string> | string;
	}
	export type ServersDetails = {
	    [id: string]: ServerDetails;
	};
	export type RoutingServers = {
	    [id: string]: RoutingServer;
	}; class RestApi {
	    server: Net.Server;
	    port: number;
	    servers: RoutingServers;
	    globalTracking: GlobalTracking;
	    serversDetails: ServersDetails;
	    openSockets: {
	        [id: string]: Net.Socket;
	    };
	    constructor(port: number, globalTracking: GlobalTracking, serversDetails: ServersDetails, servers: RoutingServers);
	    createServer(): void;
	    handleReload(port: number): void;
	    handleSocket(socket: Net.Socket): void;
	    sendInformation(socket: Net.Socket): Promise<boolean>;
	}
	export default RestApi;

}
declare module 'dimensions/node_modules/dimensions/index' {
	import * as redis from 'redis';
	import RoutingServer from 'dimensions/routingserver';
	import ListenServer from 'dimensions/listenserver';
	import { ConfigOptions } from 'dimensions/configloader';
	import ServerDetails from 'dimensions/serverdetails';
	import GlobalHandlers from 'dimensions/globalhandlers';
	import GlobalTracking from 'dimensions/globaltracking';
	import RestApi from 'dimensions/restapi';
	import Logger from 'dimensions/logger'; class Dimensions {
	    servers: {
	        [id: string]: RoutingServer;
	    };
	    options: ConfigOptions;
	    listenServers: {
	        [id: number]: ListenServer;
	    };
	    handlers: GlobalHandlers;
	    redisClient: redis.RedisClient;
	    serversDetails: {
	        [id: string]: ServerDetails;
	    };
	    globalTracking: GlobalTracking;
	    restApi: RestApi;
	    logging: Logger;
	    constructor(logging: Logger);
	    printServerCounts(): void;
	    handleCommand(cmd: string): void;
	    passOnReloadToExtensions(): void;
	    reloadClientHandlers(): void;
	    reloadTerrariaServerHandlers(): void;
	    reloadExtensions(): void;
	    reloadServers(): void;
	}
	export default Dimensions;

}
