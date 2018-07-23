import PacketWriter from 'dimensions/packets/packetwriter';

describe("packetwriter", () => {
    it("should correctly write the type of packet", () => {
        const packetWriter: PacketWriter = new PacketWriter(3);
        packetWriter.setType(5);
        expect(packetWriter.data.readInt8(2)).toEqual(5);
    });

    describe("length", () => {
        it("should correctly set the length of the packet after setting type", () => {
            const packetWriter: PacketWriter = new PacketWriter(3);
            packetWriter.setType(5);
            expect(packetWriter.data.readInt16LE(0)).toEqual(3);
        });

        it("should correctly set the length of the packet after packing a byte", () => {
            const packetWriter: PacketWriter = new PacketWriter(4);
            packetWriter.setType(5);
            packetWriter.packByte(1);
            console.log(packetWriter.buf);
            expect(packetWriter.data.readInt16LE(0)).toEqual(4);
        });

        it("should correctly set the length of the packet after packing a uint16", () => {
            const packetWriter: PacketWriter = new PacketWriter(5);
            packetWriter.setType(5);
            packetWriter.packUInt16(1);
            expect(packetWriter.data.readInt16LE(0)).toEqual(5);
        });

        it("should correctly set the length of the packet after packing an int16", () => {
            const packetWriter: PacketWriter = new PacketWriter(5);
            packetWriter.setType(5);
            packetWriter.packInt16(1);
            expect(packetWriter.data.readInt16LE(0)).toEqual(5);
        });

        it("should correctly set the length of the packet after packing a uint32", () => {
            const packetWriter: PacketWriter = new PacketWriter(7);
            packetWriter.setType(5);
            packetWriter.packUInt32(1);
            expect(packetWriter.data.readInt16LE(0)).toEqual(7);
        });

        it("should correctly set the length of the packet after packing an int32", () => {
            const packetWriter: PacketWriter = new PacketWriter(7);
            packetWriter.setType(5);
            packetWriter.packInt32(1);
            expect(packetWriter.data.readInt16LE(0)).toEqual(7);
        });

        it("should correctly set the length of the packet after packing a single", () => {
            const packetWriter: PacketWriter = new PacketWriter(7);
            packetWriter.setType(5);
            packetWriter.packSingle(5);
            expect(packetWriter.data.readInt16LE(0)).toEqual(7);
        });

        it("should correctly set the length of the packet after packing a short string", () => {
            const packetWriter: PacketWriter = new PacketWriter(9);
            packetWriter.setType(5);
            packetWriter.packString("1 3 5");
            expect(packetWriter.data.readInt16LE(0)).toEqual(9);
        });

        it("should correctly set the length of the packet after packing a large string", () => {
            const packetWriter: PacketWriter = new PacketWriter(677);
            let str = "abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,";
            packetWriter.setType(5);
            packetWriter.packString(str);
            expect(packetWriter.data.readInt16LE(0)).toEqual(677);
        });
    });
});