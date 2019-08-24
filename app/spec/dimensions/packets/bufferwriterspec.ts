import BufferWriter from 'dimensions/packets/bufferwriter';
import PacketWriter from 'dimensions/packets/packetwriter';
import NetworkText from 'dimensions/packets/networktext';

describe("bufferwriter", () => {
    // PacketWriter is used to not have to specify len
    let bufferWriter: PacketWriter;

    beforeEach(() => {
        bufferWriter = new PacketWriter(BufferWriter);
    });

    it("should start with an empty string of data", () => {
        expect(bufferWriter.data.toString("hex")).toEqual("");
    });

    describe("strings", () => {
        it("should correctly pack a short string of letters", () => {
            bufferWriter.packString("abcdefghijklmnopqrstuvwxyz");
            expect(bufferWriter.data.toString("hex")).toEqual("1a6162636465666768696a6b6c6d6e6f707172737475767778797a");
        });

        it("should correctly pack a short string of numbers", () => {
            bufferWriter.packString("1234567890");
            expect(bufferWriter.data.toString("hex")).toEqual("0a31323334353637383930");
        });

        it("should correctly pack a short string of symbols", () => {
            bufferWriter.packString("£!\"$%^&*()-='?/>.<,");
            expect(bufferWriter.data.toString("hex")).toEqual("14c2a3212224255e262a28292d3d273f2f3e2e3c2c");
        });

        it("should correctly pack multiple short strings", () => {
            bufferWriter.packString("abcdefghijklmnopqrstuvwxyz");
            bufferWriter.packString("1234567890");
            bufferWriter.packString("£!\"$%^&*()-='?/>.<,");
            expect(bufferWriter.data.toString("hex")).toEqual("1a6162636465666768696a6b6c6d6e6f707172737475767778797a0a3132333435363738393014c2a3212224255e262a28292d3d273f2f3e2e3c2c");
        });

        it("should correctly pack a large string", () => {
            bufferWriter.packString("abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,");
            expect(bufferWriter.data.toString("hex")).toEqual("a0056162636465666768696a6b6c6d6e6f707172737475767778797a31323334353637383930c2a3212224255e262a28292d3d273f2f3e2e3c2c6162636465666768696a6b6c6d6e6f707172737475767778797a31323334353637383930c2a3212224255e262a28292d3d273f2f3e2e3c2c6162636465666768696a6b6c6d6e6f707172737475767778797a31323334353637383930c2a3212224255e262a28292d3d273f2f3e2e3c2c6162636465666768696a6b6c6d6e6f707172737475767778797a31323334353637383930c2a3212224255e262a28292d3d273f2f3e2e3c2c6162636465666768696a6b6c6d6e6f707172737475767778797a31323334353637383930c2a3212224255e262a28292d3d273f2f3e2e3c2c6162636465666768696a6b6c6d6e6f707172737475767778797a31323334353637383930c2a3212224255e262a28292d3d273f2f3e2e3c2c6162636465666768696a6b6c6d6e6f707172737475767778797a31323334353637383930c2a3212224255e262a28292d3d273f2f3e2e3c2c6162636465666768696a6b6c6d6e6f707172737475767778797a31323334353637383930c2a3212224255e262a28292d3d273f2f3e2e3c2c6162636465666768696a6b6c6d6e6f707172737475767778797a31323334353637383930c2a3212224255e262a28292d3d273f2f3e2e3c2c6162636465666768696a6b6c6d6e6f707172737475767778797a31323334353637383930c2a3212224255e262a28292d3d273f2f3e2e3c2c6162636465666768696a6b6c6d6e6f707172737475767778797a31323334353637383930c2a3212224255e262a28292d3d273f2f3e2e3c2c6162636465666768696a6b6c6d6e6f707172737475767778797a31323334353637383930c2a3212224255e262a28292d3d273f2f3e2e3c2c");  
        });
    });

    it("should correctly pack network text", () => {
        bufferWriter.packNetworkText(new NetworkText(0, "abcdefghijklmnopqrstuvwxyz"));
        expect(bufferWriter.data.toString("hex")).toEqual("001a6162636465666768696a6b6c6d6e6f707172737475767778797a");
    });

    it("should correctly pack hex", () => {
        let hex = "a2a2";
        bufferWriter.packHex(hex);
        expect(bufferWriter.data.toString("hex")).toEqual(hex);
    });

    describe("bytes", () => {
        it("should correctly pack a byte", () => {
            bufferWriter.packByte(50);
            expect(bufferWriter.data.toString("hex")).toEqual("32");
        });

        it("should correctly pack a maximum byte", () => {
            bufferWriter.packByte(255);
            expect(bufferWriter.data.toString("hex")).toEqual("ff");
        });

        it("should correctly pack a minimum byte", () => {
            bufferWriter.packByte(0);
            expect(bufferWriter.data.toString("hex")).toEqual("00");
        });

        it("should ignore negativity of numbers", () => {
            bufferWriter.packByte(-50);
            expect(bufferWriter.data.toString("hex")).toEqual("32");
        });
    });

    describe("colors", () => {
        it("should correctly pack a normal color", () => {
            bufferWriter.packColor({R: 255, G: 150, B: 50});
            expect(bufferWriter.data.toString("hex")).toEqual("ff9632");
        });

        it("should correctly pack a negative color", () => {
            bufferWriter.packColor({R: -255, G: -150, B: -50});
            expect(bufferWriter.data.toString("hex")).toEqual("ff9632");
        });
    });

    describe("uint16", () => {
        it("should correctly pack a small uint16", () => {
            bufferWriter.packUInt16(50);
            expect(bufferWriter.data.toString("hex")).toEqual("3200");
        });

        it("should correctly pack a maximum uint16", () => {
            bufferWriter.packUInt16(65535);
            expect(bufferWriter.data.toString("hex")).toEqual("ffff");
        });

        it("should correctly pack zero uint16", () => {
            bufferWriter.packUInt16(0);
            expect(bufferWriter.data.toString("hex")).toEqual("0000");
        });
    });

    describe("int16", () => {
        it("should correctly pack a small int16", () => {
            bufferWriter.packInt16(50);
            expect(bufferWriter.data.toString("hex")).toEqual("3200");
        });

        it("should correctly pack maximum int16", () => {
            bufferWriter.packInt16(32767);
            expect(bufferWriter.data.toString("hex")).toEqual("ff7f");
        });

        it("should correctly pack zero int16", () => {
            bufferWriter.packInt16(0);
            expect(bufferWriter.data.toString("hex")).toEqual("0000");
        });

        it("should correctly pack negative int16", () => {
            bufferWriter.packInt16(-255);
            expect(bufferWriter.data.toString("hex")).toEqual("01ff");
        });

        it("should correctly pack largest negative int16", () => {
            bufferWriter.packInt16(-32768);
            expect(bufferWriter.data.toString("hex")).toEqual("0080");
        });
    });

    describe("uint32", () => {
        it("should correctly pack a small uint32", () => {
            bufferWriter.packUInt32(50);
            expect(bufferWriter.data.toString("hex")).toEqual("32000000");
        });

        it("should correctly pack a medium uint32", () => {
            bufferWriter.packUInt32(32767);
            expect(bufferWriter.data.toString("hex")).toEqual("ff7f0000");
        });

        it("should correctly pack maximum uint32", () => {
            bufferWriter.packUInt32(4294967295);
            expect(bufferWriter.data.toString("hex")).toEqual("ffffffff");
        });

        it("should correctly pack zero uint32", () => {
            bufferWriter.packUInt32(0);
            expect(bufferWriter.data.toString("hex")).toEqual("00000000");
        });
    });

    describe("int32", () => {
        it("should correctly pack a small int32", () => {
            bufferWriter.packInt32(50);
            expect(bufferWriter.data.toString("hex")).toEqual("32000000");
        });

        it("should correctly pack a medium int32", () => {
            bufferWriter.packInt32(32767);
            expect(bufferWriter.data.toString("hex")).toEqual("ff7f0000");
        });

        it("should correctly pack maximum int32", () => {
            bufferWriter.packInt32(2147483647);
            expect(bufferWriter.data.toString("hex")).toEqual("ffffff7f");
        });

        it("should correctly pack zero int32", () => {
            bufferWriter.packInt32(0);
            expect(bufferWriter.data.toString("hex")).toEqual("00000000");
        });

        it("should correctly pack negative int32", () => {
            bufferWriter.packInt32(-255);
            expect(bufferWriter.data.toString("hex")).toEqual("01ffffff");
        });

        it("should correctly pack a large negative int32", () => {
            bufferWriter.packInt32(-2147483648);
            expect(bufferWriter.data.toString("hex")).toEqual("00000080");
        });
    });

    describe("single", () => {
        it("should correctly pack a small integer", () => {
            bufferWriter.packSingle(50);
            expect(bufferWriter.data.toString("hex")).toEqual("00004842");
        });

        it("should correctly pack a medium integer", () => {
            bufferWriter.packSingle(32767);
            expect(bufferWriter.data.toString("hex")).toEqual("00feff46");
        });

        it("should correctly pack a large integer", () => {
            bufferWriter.packSingle(2147483647);
            expect(bufferWriter.data.toString("hex")).toEqual("0000004f");
        });

        it("should correctly pack zero integer", () => {
            bufferWriter.packSingle(0);
            expect(bufferWriter.data.toString("hex")).toEqual("00000000");
        });

        it("should correctly pack negative integer", () => {
            bufferWriter.packSingle(-255);
            expect(bufferWriter.data.toString("hex")).toEqual("00007fc3");
        });

        it("should correctly pack a large negative integer", () => {
            bufferWriter.packSingle(-2147483648);
            expect(bufferWriter.data.toString("hex")).toEqual("000000cf");
        });

        it("should correctly pack a small single", () => {
            bufferWriter.packSingle(0.5);
            expect(bufferWriter.data.toString("hex")).toEqual("0000003f");
        });

        it("should correctly pack a small negative single", () => {
            bufferWriter.packSingle(-0.5);
            expect(bufferWriter.data.toString("hex")).toEqual("000000bf");
        });

        it("should correctly pack a large single", () => {
            bufferWriter.packSingle(2147483647.5);
            expect(bufferWriter.data.toString("hex")).toEqual("0000004f");
        });

        it("should correctly pack a large negative single", () => {
            bufferWriter.packSingle(-2147483647.5);
            expect(bufferWriter.data.toString("hex")).toEqual("000000cf");
        });
    });
});