import PacketReader from '@popstarfreas/packetfactory/packetreader';

describe("packetreader", () => {
    let reader: PacketReader;

    beforeEach(() => {
        reader = new PacketReader(Buffer.from("02000505", "hex"));
    });

    it("should correctly store the type of the packet", () => {
        expect(reader.type).toEqual(5);
    });
});
