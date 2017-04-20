import PacketReader from 'dimensions/packets/packetreader';
import HexWriter from 'dimensions/packets/hexwriter';
import BitsByte from './bitsbyte';

class PlayerDeathReason {
    protected _reasonType: BitsByte;
    protected _killerPlayerId: number | null;
    protected _killingNpcIndex: number | null;
    protected _projectileIndex: number | null;
    protected _typeOfDeath: BitsByte;
    protected _projectileType: number | null;
    protected _itemType: number | null;
    protected _itemPrefix: number | null;
    protected _deathReason: string | null;

    constructor(reader: PacketReader) {
        this.processDeathReason(reader);
    }

    public get deathReason(): string {
        return this._deathReason || " was killed";
    }

    public getHexData(): string {
        let writer = new HexWriter()
        writer.packByte(this._reasonType.value)

        if (this._killerPlayerId !== null) {
            writer.packInt16(this._killerPlayerId);
        }

        if (this._killingNpcIndex !== null) {
            writer.packInt16(this._killingNpcIndex);
        }

        if (this._projectileIndex !== null) {
            writer.packInt16(this._projectileIndex);
        }

        if (this._reasonType[3]) {
            writer.packByte(this._typeOfDeath.value);
        }

        if (this._projectileType !== null) {
            writer.packInt16(this._projectileType);
        }

        if (this._itemType !== null) {
            writer.packInt16(this._itemType);
        }

        if (this._itemPrefix !== null) {
            writer.packByte(this._itemPrefix);
        }

        if (this._deathReason !== null) {
            writer.packString(this._deathReason);
        }

        return writer.data;
    }

    protected processDeathReason(reader: PacketReader): void {
        this._reasonType = new BitsByte(reader.readByte());
        if (this._reasonType[0]) {
            this._killerPlayerId = reader.readInt16();
        }

        if (this._reasonType[1]) {
            this._killingNpcIndex = reader.readInt16();
        }

        if (this._reasonType[2]) {
            this._projectileIndex = reader.readInt16();
        }

        if (this._reasonType[3]) {
            this._typeOfDeath = new BitsByte(reader.readByte());
        }

        if (this._reasonType[4]) {
            this._projectileType = reader.readInt16();
        }

        if (this._reasonType[5]) {
            this._itemType = reader.readInt16();
        }

        if (this._reasonType[6]) {
            this._itemPrefix = reader.readByte();
        }

        if (this._reasonType[7]) {
            this._deathReason = reader.readString();
        }
    }
}

export default PlayerDeathReason;