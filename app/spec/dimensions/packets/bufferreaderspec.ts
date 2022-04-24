import BufferReader from 'dimensions/packets/bufferreader';
describe("bufferreader", () => {
    describe("byte", () => {
        it("should read a byte correctly", () => {
            let reader = new BufferReader(Buffer.from("05", "hex"));
            expect(reader.readByte()).toEqual(5);
        });

        it("should read the maximum of a byte correctly", () => {
            let reader = new BufferReader(Buffer.from("ff", "hex"));
            expect(reader.readByte()).toEqual(255);
        });

        it("should read a minimum byte correctly", () => {
            let reader = new BufferReader(Buffer.from("00", "hex"));
            expect(reader.readByte()).toEqual(0);
        });
    });

    describe("color", () => {
        it("should read a color correctly", () => {
            let reader = new BufferReader(Buffer.from("050607", "hex"));
            expect(reader.readColor()).toEqual({R: 5, G: 6, B: 7});
        });

        it("should read a zero color correctly", () => {
            let reader = new BufferReader(Buffer.from("000000", "hex"));
            expect(reader.readColor()).toEqual({R: 0, G: 0, B: 0});
        });

        it("should read a maximum color correctly", () => {
            let reader = new BufferReader(Buffer.from("ffffff", "hex"));
            expect(reader.readColor()).toEqual({R: 255, G: 255, B: 255});
        });
    });

    describe("sbyte", () => {
        it("should read a signed byte correctly", () => {
            let reader = new BufferReader(Buffer.from("ff", "hex"));
            expect(reader.readSByte()).toEqual(-1);
        });

        it("should read a zero signed byte correctly", () => {
            let reader = new BufferReader(Buffer.from("00", "hex"));
            expect(reader.readSByte()).toEqual(0);
        });

        it("should read a positive signed byte correctly", () => {
            let reader = new BufferReader(Buffer.from("05", "hex"));
            expect(reader.readSByte()).toEqual(5);
        });
    });

    describe("uint16", () => {
        it("should correctly read a small uint16", () => {
            let reader = new BufferReader(Buffer.from("3200", "hex"));
            expect(reader.readUInt16()).toEqual(50);
        });

        it("should correctly read maximum uint16", () => {
            let reader = new BufferReader(Buffer.from("ffff", "hex"));
            expect(reader.readUInt16()).toEqual(65535);
        });

        it("should correctly read zero uint16", () => {
            let reader = new BufferReader(Buffer.from("0000", "hex"));
            expect(reader.readUInt16()).toEqual(0);
        });
    });

    describe("uint32", () => {
        it("should correctly read a small uint32", () => {
            let reader = new BufferReader(Buffer.from("32000000", "hex"));
            expect(reader.readUInt32()).toEqual(50);
        });

        it("should correctly read maximum uint16", () => {
            let reader = new BufferReader(Buffer.from("ffff0000", "hex"));
            expect(reader.readUInt32()).toEqual(65535);
        });

        it("should correctly read maximum uint32", () => {
            let reader = new BufferReader(Buffer.from("ffffffff", "hex"));
            expect(reader.readUInt32()).toEqual(4294967295);
        });

        it("should correctly read zero uint32", () => {
            let reader = new BufferReader(Buffer.from("00000000", "hex"));
            expect(reader.readUInt32()).toEqual(0);
        });
    });

    describe("uint64", () => {
        it("should correctly read a small uint64", () => {
            let reader = new BufferReader(Buffer.from("3200000000000000", "hex"));
            expect(reader.readUInt64()).toEqual(50);
        });

        it("should correctly read maximum uint16", () => {
            let reader = new BufferReader(Buffer.from("ffff000000000000", "hex"));
            expect(reader.readUInt64()).toEqual(65535);
        });

        it("should correctly read maximum uint32", () => {
            let reader = new BufferReader(Buffer.from("ffffffff00000000", "hex"));
            expect(reader.readUInt64()).toEqual(4294967295);
        });

        it("should correctly read maximum uint64", () => {
            let reader = new BufferReader(Buffer.from("ffffffffffffffff", "hex"));
            expect(reader.readUInt64()).toEqual(18446744073709551615);
        });

        it("should correctly read zero uint64", () => {
            let reader = new BufferReader(Buffer.from("0000000000000000", "hex"));
            expect(reader.readUInt64()).toEqual(0);
        });
    });

    describe("int16", () => {
        it("should correctly read a small int16", () => {
            let reader = new BufferReader(Buffer.from("3200", "hex"));
            expect(reader.readInt16()).toEqual(50);
        });

        it("should correctly read maximum int16", () => {
            let reader = new BufferReader(Buffer.from("ff7f", "hex"));
            expect(reader.readInt16()).toEqual(32767);
        });

        it("should correctly read zero int16", () => {
            let reader = new BufferReader(Buffer.from("0000", "hex"));
            expect(reader.readInt16()).toEqual(0);
        });

        it("should correctly read negative int16", () => {
            let reader = new BufferReader(Buffer.from("01ff", "hex"));
            expect(reader.readInt16()).toEqual(-255);
        });

        it("should correctly read largest negative int16", () => {
            let reader = new BufferReader(Buffer.from("0080", "hex"));
            expect(reader.readInt16()).toEqual(-32768);
        });
    });

    describe("int32", () => {
        it("should correctly read a small int32", () => {
            let reader = new BufferReader(Buffer.from("32000000", "hex"));
            expect(reader.readInt32()).toEqual(50);
        });

        it("should correctly read maximum int16", () => {
            let reader = new BufferReader(Buffer.from("ff7f0000", "hex"));
            expect(reader.readInt32()).toEqual(32767);
        });

        it("should correctly read maximum int32", () => {
            let reader = new BufferReader(Buffer.from("ffffff7f", "hex"));
            expect(reader.readInt32()).toEqual(2147483647);
        });

        it("should correctly read zero int32", () => {
            let reader = new BufferReader(Buffer.from("00000000", "hex"));
            expect(reader.readInt32()).toEqual(0);
        });

        it("should correctly read negative int32", () => {
            let reader = new BufferReader(Buffer.from("01ffffff", "hex"));
            expect(reader.readInt32()).toEqual(-255);
        });

        it("should correctly read largest negative int32", () => {
            let reader = new BufferReader(Buffer.from("00000080", "hex"));
            expect(reader.readInt32()).toEqual(-2147483648);
        });
    });

    describe("single", () => {
        it("should correctly read a small integer", () => {
            let reader = new BufferReader(Buffer.from("00004842", "hex"));
            expect(reader.readSingle()).toEqual(50);
        });

        it("should correctly read a medium integer", () => {
            let reader = new BufferReader(Buffer.from("00feff46", "hex"));
            expect(reader.readSingle()).toEqual(32767);
        });

        it("should correctly read a large integer", () => {
            let reader = new BufferReader(Buffer.from("0000004f", "hex"));
            expect(reader.readSingle()).toEqual(2147483648);
        });

        it("should correctly read zero integer", () => {
            let reader = new BufferReader(Buffer.from("00000000", "hex"));
            expect(reader.readSingle()).toEqual(0);
        });

        it("should correctly read a large negative integer", () => {
            let reader = new BufferReader(Buffer.from("000000cf", "hex"));
            expect(reader.readSingle()).toEqual(-2147483648);
        });

        it("should correctly read a small single", () => {
            let reader = new BufferReader(Buffer.from("0000003f", "hex"));
            expect(reader.readSingle()).toEqual(0.5);
        });

        it("should correctly read a small negative single", () => {
            let reader = new BufferReader(Buffer.from("000000bf", "hex"));
            expect(reader.readSingle()).toEqual(-0.5);
        });
    });

    describe("strings", () => {
        it("should correctly read a short string of letters", () => {
            let reader = new BufferReader(Buffer.from("1a6162636465666768696a6b6c6d6e6f707172737475767778797a", "hex"));
            expect(reader.readString()).toEqual("abcdefghijklmnopqrstuvwxyz");
        });

        it("should correctly read a short string of numbers", () => {
            let reader = new BufferReader(Buffer.from("0a31323334353637383930", "hex"));
            expect(reader.readString()).toEqual("1234567890");
        });

        it("should correctly read a short string of symbols", () => {
            let reader = new BufferReader(Buffer.from("14c2a3212224255e262a28292d3d273f2f3e2e3c2c", "hex"));
            expect(reader.readString()).toEqual("£!\"$%^&*()-='?/>.<,");
        });

        it("should correctly read multiple short strings", () => {
            let reader = new BufferReader(Buffer.from("1a6162636465666768696a6b6c6d6e6f707172737475767778797a0a3132333435363738393014c2a3212224255e262a28292d3d273f2f3e2e3c2c", "hex"));
            expect(reader.readString()).toEqual("abcdefghijklmnopqrstuvwxyz");
            expect(reader.readString()).toEqual("1234567890");
            expect(reader.readString()).toEqual("£!\"$%^&*()-='?/>.<,");
        });

        it("should correctly read a large string", () => {
            let data = "a0056162636465666768696a6b6c6d6e6f707172737475767778797a31323334353637383930c2a3212224255e262a28292d3d273f2f3e2e3c2c6162636465666768696a6b6c6d6e6f707172737475767778797a31323334353637383930c2a3212224255e262a28292d3d273f2f3e2e3c2c6162636465666768696a6b6c6d6e6f707172737475767778797a31323334353637383930c2a3212224255e262a28292d3d273f2f3e2e3c2c6162636465666768696a6b6c6d6e6f707172737475767778797a31323334353637383930c2a3212224255e262a28292d3d273f2f3e2e3c2c6162636465666768696a6b6c6d6e6f707172737475767778797a31323334353637383930c2a3212224255e262a28292d3d273f2f3e2e3c2c6162636465666768696a6b6c6d6e6f707172737475767778797a31323334353637383930c2a3212224255e262a28292d3d273f2f3e2e3c2c6162636465666768696a6b6c6d6e6f707172737475767778797a31323334353637383930c2a3212224255e262a28292d3d273f2f3e2e3c2c6162636465666768696a6b6c6d6e6f707172737475767778797a31323334353637383930c2a3212224255e262a28292d3d273f2f3e2e3c2c6162636465666768696a6b6c6d6e6f707172737475767778797a31323334353637383930c2a3212224255e262a28292d3d273f2f3e2e3c2c6162636465666768696a6b6c6d6e6f707172737475767778797a31323334353637383930c2a3212224255e262a28292d3d273f2f3e2e3c2c6162636465666768696a6b6c6d6e6f707172737475767778797a31323334353637383930c2a3212224255e262a28292d3d273f2f3e2e3c2c6162636465666768696a6b6c6d6e6f707172737475767778797a31323334353637383930c2a3212224255e262a28292d3d273f2f3e2e3c2ccc";
            let str = "abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,abcdefghijklmnopqrstuvwxyz1234567890£!\"$%^&*()-='?/>.<,";

            let reader = new BufferReader(Buffer.from(data, "hex"));
            expect(reader.readString()).toEqual(str);
        });
    });

    it("should correctly read network text", () => {
        let data = "001a6162636465666768696a6b6c6d6e6f707172737475767778797a";
        let str = "abcdefghijklmnopqrstuvwxyz";
        let reader = new BufferReader(Buffer.from(data, "hex"));
        let networkText = reader.readNetworkText();
        expect(networkText.mode).toEqual(0);
        expect(networkText.text).toEqual(str);
    });
});
