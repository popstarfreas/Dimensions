import PacketReader from 'dimensions/packets/packetreader';

describe("packetreader", () => {
    let reader: PacketReader;
    
    beforeEach(() => {
        reader = new PacketReader("02000505");
    });

    it("should correctly remove the packet length and type", () => {
        expect(reader.data).toEqual("05");
    });

    it("should correctly store the type of the packet", () => {
        expect(reader.type).toEqual(5);
    });
});