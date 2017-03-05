import HexReader from 'dimensions/packets/hexreader';
describe("hexreader", () => {
    describe("byte", () => {
        it("should read a byte correctly", () => {
            let reader = new HexReader("05");
            expect(reader.readByte()).toEqual(5);
        });

        it("should read the maximum of a byte correctly", () => {
            let reader = new HexReader("ff");
            expect(reader.readByte()).toEqual(255);
        });

        it("should read a minimum byte correctly", () => {
            let reader = new HexReader("00");
            expect(reader.readByte()).toEqual(0);
        });
    });

    describe("color", () => {
        it("should read a color correctly", () => {
            let reader = new HexReader("050607");
            expect(reader.readColor()).toEqual({R: 5, G: 6, B: 7});
        });

        it("should read a zero color correctly", () => {
            let reader = new HexReader("000000");
            expect(reader.readColor()).toEqual({R: 0, G: 0, B: 0});
        });

        it("should read a maximum color correctly", () => {
            let reader = new HexReader("ffffff");
            expect(reader.readColor()).toEqual({R: 255, G: 255, B: 255});
        });
    });

    describe("sbyte", () => {
        it("should read a signed byte correctly", () => {
            let reader = new HexReader("ff");
            expect(reader.readSByte()).toEqual(-1);
        });

        it("should read a zero signed byte correctly", () => {
            let reader = new HexReader("00");
            expect(reader.readSByte()).toEqual(0);
        });

        it("should read a positive signed byte correctly", () => {
            let reader = new HexReader("05");
            expect(reader.readSByte()).toEqual(5);
        });
    });
});