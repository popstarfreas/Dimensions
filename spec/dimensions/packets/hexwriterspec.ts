import HexWriter from 'dimensions/packets/hexwriter';
import NetworkText from 'dimensions/packets/networktext';

describe("hexwriter", () => {
    let hexWriter: HexWriter;

    beforeEach(() => {
        hexWriter = new HexWriter();
    });

    it("should start with an empty string of data", () => {
        expect(hexWriter.data).toEqual("");
    });

    describe("strings", () => {
        it("should correctly pack a short string of letters", () => {
            hexWriter.packString("abcdefghijklmnopqrstuvwxyz");
            expect(hexWriter.data).toEqual("1a6162636465666768696a6b6c6d6e6f707172737475767778797a");
        });

        it("should correctly pack a short string of numbers", () => {
            hexWriter.packString("1234567890");
            expect(hexWriter.data).toEqual("0a31323334353637383930");
        });

        it("should correctly pack a short string of symbols", () => {
            hexWriter.packString("£!\"$%^&*()-='?/>.<,");
            expect(hexWriter.data).toEqual("14c2a3212224255e262a28292d3d273f2f3e2e3c2c");
        });

        it("should correctly pack multiple short strings", () => {
            hexWriter.packString("abcdefghijklmnopqrstuvwxyz");
            hexWriter.packString("1234567890");
            hexWriter.packString("£!\"$%^&*()-='?/>.<,");
            expect(hexWriter.data).toEqual("1a6162636465666768696a6b6c6d6e6f707172737475767778797a0a3132333435363738393014c2a3212224255e262a28292d3d273f2f3e2e3c2c");
        });

        it("should correctly pack a large string", () => {
            hexWriter.packString("abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,");
            expect(hexWriter.data).toEqual("a0056162636465666768696a6b6c6d6e6f707172737475767778797a31323334353637383930c2a3212224255e262a28292d3d273f2f3e2e3c2c6162636465666768696a6b6c6d6e6f707172737475767778797a31323334353637383930c2a3212224255e262a28292d3d273f2f3e2e3c2c6162636465666768696a6b6c6d6e6f707172737475767778797a31323334353637383930c2a3212224255e262a28292d3d273f2f3e2e3c2c6162636465666768696a6b6c6d6e6f707172737475767778797a31323334353637383930c2a3212224255e262a28292d3d273f2f3e2e3c2c6162636465666768696a6b6c6d6e6f707172737475767778797a31323334353637383930c2a3212224255e262a28292d3d273f2f3e2e3c2c6162636465666768696a6b6c6d6e6f707172737475767778797a31323334353637383930c2a3212224255e262a28292d3d273f2f3e2e3c2c6162636465666768696a6b6c6d6e6f707172737475767778797a31323334353637383930c2a3212224255e262a28292d3d273f2f3e2e3c2c6162636465666768696a6b6c6d6e6f707172737475767778797a31323334353637383930c2a3212224255e262a28292d3d273f2f3e2e3c2c6162636465666768696a6b6c6d6e6f707172737475767778797a31323334353637383930c2a3212224255e262a28292d3d273f2f3e2e3c2c6162636465666768696a6b6c6d6e6f707172737475767778797a31323334353637383930c2a3212224255e262a28292d3d273f2f3e2e3c2c6162636465666768696a6b6c6d6e6f707172737475767778797a31323334353637383930c2a3212224255e262a28292d3d273f2f3e2e3c2c6162636465666768696a6b6c6d6e6f707172737475767778797a31323334353637383930c2a3212224255e262a28292d3d273f2f3e2e3c2c");  
        });
    });

    it("should correctly pack network text", () => {
        hexWriter.packNetworkText(new NetworkText(0, "abcdefghijklmnopqrstuvwxyz"));
        expect(hexWriter.data).toEqual("001a6162636465666768696a6b6c6d6e6f707172737475767778797a");
    });

    it("should correctly pack hex", () => {
        let hex = "a2a2";
        hexWriter.packHex(hex);
        expect(hexWriter.data).toEqual(hex);
    });

    describe("bytes", () => {
        it("should correctly pack a byte", () => {
            hexWriter.packByte(50);
            expect(hexWriter.data).toEqual("32");
        });

        it("should correctly pack a maximum byte", () => {
            hexWriter.packByte(255);
            expect(hexWriter.data).toEqual("ff");
        });

        it("should correctly pack a minimum byte", () => {
            hexWriter.packByte(0);
            expect(hexWriter.data).toEqual("00");
        });

        it("should ignore negativity of numbers", () => {
            hexWriter.packByte(-50);
            expect(hexWriter.data).toEqual("32");
        });
    });

    describe("colors", () => {
        it("should correctly pack a normal color", () => {
            hexWriter.packColor({R: 255, G: 150, B: 50});
            expect(hexWriter.data).toEqual("ff9632");
        });

        it("should correctly pack a negative color", () => {
            hexWriter.packColor({R: -255, G: -150, B: -50});
            expect(hexWriter.data).toEqual("ff9632");
        });
    });

    describe("uint16", () => {
        it("should correctly pack a small uint16", () => {
            hexWriter.packUInt16(50);
            expect(hexWriter.data).toEqual("3200");
        });

        it("should correctly pack a maximum uint16", () => {
            hexWriter.packUInt16(65535);
            expect(hexWriter.data).toEqual("ffff");
        });

        it("should correctly pack zero uint16", () => {
            hexWriter.packUInt16(0);
            expect(hexWriter.data).toEqual("0000");
        });
    });

    describe("int16", () => {
        it("should correctly pack a small int16", () => {
            hexWriter.packInt16(50);
            expect(hexWriter.data).toEqual("3200");
        });

        it("should correctly pack maximum int16", () => {
            hexWriter.packInt16(32767);
            expect(hexWriter.data).toEqual("ff7f");
        });

        it("should correctly pack zero int16", () => {
            hexWriter.packInt16(0);
            expect(hexWriter.data).toEqual("0000");
        });

        it("should correctly pack negative int16", () => {
            hexWriter.packInt16(-255);
            expect(hexWriter.data).toEqual("01ff");
        });

        it("should correctly pack largest negative int16", () => {
            hexWriter.packInt16(-32768);
            expect(hexWriter.data).toEqual("0080");
        });
    });

    describe("uint32", () => {
        it("should correctly pack a small uint32", () => {
            hexWriter.packUInt32(50);
            expect(hexWriter.data).toEqual("32000000");
        });

        it("should correctly pack a medium uint32", () => {
            hexWriter.packUInt32(32767);
            expect(hexWriter.data).toEqual("ff7f0000");
        });

        it("should correctly pack maximum uint32", () => {
            hexWriter.packUInt32(4294967295);
            expect(hexWriter.data).toEqual("ffffffff");
        });

        it("should correctly pack zero uint32", () => {
            hexWriter.packUInt32(0);
            expect(hexWriter.data).toEqual("00000000");
        });
    });

    describe("int32", () => {
        it("should correctly pack a small int32", () => {
            hexWriter.packInt32(50);
            expect(hexWriter.data).toEqual("32000000");
        });

        it("should correctly pack a medium int32", () => {
            hexWriter.packInt32(32767);
            expect(hexWriter.data).toEqual("ff7f0000");
        });

        it("should correctly pack maximum int32", () => {
            hexWriter.packInt32(2147483647);
            expect(hexWriter.data).toEqual("ffffff7f");
        });

        it("should correctly pack zero int32", () => {
            hexWriter.packInt32(0);
            expect(hexWriter.data).toEqual("00000000");
        });

        it("should correctly pack negative int32", () => {
            hexWriter.packInt32(-255);
            expect(hexWriter.data).toEqual("01ffffff");
        });

        it("should correctly pack a large negative int32", () => {
            hexWriter.packInt32(-2147483648);
            expect(hexWriter.data).toEqual("00000080");
        });
    });

    describe("single", () => {
        it("should correctly pack a small integer", () => {
            hexWriter.packSingle(50);
            expect(hexWriter.data).toEqual("00004842");
        });

        it("should correctly pack a medium integer", () => {
            hexWriter.packSingle(32767);
            expect(hexWriter.data).toEqual("00feff46");
        });

        it("should correctly pack a large integer", () => {
            hexWriter.packSingle(2147483647);
            expect(hexWriter.data).toEqual("0000004f");
        });

        it("should correctly pack zero integer", () => {
            hexWriter.packSingle(0);
            expect(hexWriter.data).toEqual("00000000");
        });

        it("should correctly pack negative integer", () => {
            hexWriter.packSingle(-255);
            expect(hexWriter.data).toEqual("00007fc3");
        });

        it("should correctly pack a large negative integer", () => {
            hexWriter.packSingle(-2147483648);
            expect(hexWriter.data).toEqual("000000cf");
        });

        it("should correctly pack a small single", () => {
            hexWriter.packSingle(0.5);
            expect(hexWriter.data).toEqual("0000003f");
        });

        it("should correctly pack a small negative single", () => {
            hexWriter.packSingle(-0.5);
            expect(hexWriter.data).toEqual("000000bf");
        });

        it("should correctly pack a large single", () => {
            hexWriter.packSingle(2147483647.5);
            expect(hexWriter.data).toEqual("0000004f");
        });

        it("should correctly pack a large negative single", () => {
            hexWriter.packSingle(-2147483647.5);
            expect(hexWriter.data).toEqual("000000cf");
        });
    });
});