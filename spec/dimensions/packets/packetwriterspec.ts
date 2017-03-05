import PacketWriter from 'dimensions/packets/packetwriter';

describe("packetwriter", () => {
    let packetWriter: PacketWriter;

    beforeEach(() => {
        packetWriter = new PacketWriter();
    });

    it("should correctly write the type of packet", () => {
        packetWriter.setType(5);
        expect(packetWriter.data.substr(4)).toEqual("05");
    });

    describe("length", () => {
        it("should correctly start with the right length", () => {
            expect(packetWriter.data).toEqual("0200");
        });

        it("should correctly set the length of the packet after setting type", () => {
            packetWriter.setType(5);
            expect(packetWriter.data.substr(0, 4)).toEqual("0300");
        });

        it("should correctly set the length of the packet after packing a byte", () => {
            packetWriter.setType(5);
            packetWriter.packByte(1);
            expect(packetWriter.data.substr(0, 4)).toEqual("0400");
        });

        it("should correctly set the length of the packet after packing a uint16", () => {
            packetWriter.setType(5);
            packetWriter.packUInt16(1);
            expect(packetWriter.data.substr(0, 4)).toEqual("0500");
        });

        it("should correctly set the length of the packet after packing an int16", () => {
            packetWriter.setType(5);
            packetWriter.packInt16(1);
            expect(packetWriter.data.substr(0, 4)).toEqual("0500");
        });

        it("should correctly set the length of the packet after packing a uint32", () => {
            packetWriter.setType(5);
            packetWriter.packUInt32(1);
            expect(packetWriter.data.substr(0, 4)).toEqual("0700");
        });

        it("should correctly set the length of the packet after packing an int32", () => {
            packetWriter.setType(5);
            packetWriter.packInt32(1);
            expect(packetWriter.data.substr(0, 4)).toEqual("0700");
        });

        it("should correctly set the length of the packet after packing a single", () => {
            packetWriter.setType(5);
            packetWriter.packSingle(5);
            expect(packetWriter.data.substr(0, 4)).toEqual("0700");
        });

        it("should correctly set the length of the packet after packing a short string", () => {
            packetWriter.setType(5);
            packetWriter.packString("1 3 5");
            expect(packetWriter.data.substr(0, 4)).toEqual("0900");
        });

        it("should correctly set the length of the packet after packing a large string", () => {
            let str = "abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,";
            packetWriter.setType(5);
            packetWriter.packString(str);
            expect(packetWriter.data.substr(0, 4)).toEqual("a502");
        });
    });
});