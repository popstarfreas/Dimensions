import * as utils from "dimensions/utils";
import BufferWriter from "dimensions/packets/bufferwriter";

describe("utils", () => {
    it("should correctly buffer an incomplete packet", () => {
        const buf = new BufferWriter(3).packUInt16(4).packByte(0).data;
        const res = utils.getPacketsFromBuffer(buf);
        if (res.type !== "ValidPackets") {
            throw new Error("Expected ValidPackets");
        }
        expect(res.packets.length).toEqual(0);
        expect(res.bufferPacket.toString("hex")).toEqual(buf.toString("hex"));
    });

    it("should correctly buffer an incomplete packet", () => {
        const buf = new BufferWriter(2).packUInt16(4).data;
        const res = utils.getPacketsFromBuffer(buf);
        if (res.type !== "ValidPackets") {
            throw new Error("Expected ValidPackets");
        }
        expect(res.packets.length).toEqual(0);
        expect(res.bufferPacket.toString("hex")).toEqual(buf.toString("hex"));
    });

    it("should correctly buffer an incomplete packet", () => {
        const bufA = new BufferWriter(3).packUInt16(3).packByte(0).data;
        const bufB = new BufferWriter(2).packUInt16(4).data;
        const res = utils.getPacketsFromBuffer(Buffer.concat([bufA, bufB]));
        if (res.type !== "ValidPackets") {
            throw new Error("Expected ValidPackets");
        }
        expect(res.packets.length).toEqual(1);
        expect(res.packets[0].data.toString("hex")).toEqual(bufA.toString("hex"));
        expect(res.bufferPacket.toString("hex")).toEqual(bufB.toString("hex"));
    });

    it("should correctly handle an invalid packet (length = 0)", () => {
        const buf = new BufferWriter(2).packUInt16(0).data;
        const res = utils.getPacketsFromBuffer(buf);
        expect(res.type).toEqual("InvalidPacketLength");
    });

    it("should correctly handle an invalid packet (length = 1)", () => {
        const buf = new BufferWriter(2).packUInt16(1).data;
        const res = utils.getPacketsFromBuffer(buf);
        expect(res.type).toEqual("InvalidPacketLength");
    });

    it("should correctly buffer an incomplete packet length", () => {
        const buf = new BufferWriter(1).packByte(4).data;
        const res = utils.getPacketsFromBuffer(buf);
        if (res.type !== "ValidPackets") {
            throw new Error("Expected ValidPackets");
        }
        expect(res.packets.length).toEqual(0);
        expect(res.bufferPacket.toString("hex")).toEqual(buf.toString("hex"));
    });

    it("should correctly read a correct packet and buffer"
        + " the incomplete packet length of the next", () => {
            const bufA = new BufferWriter(3).packUInt16(3).packByte(0).data;
            const bufB = new BufferWriter(1).packByte(4).data;
            const res = utils.getPacketsFromBuffer(Buffer.concat([bufA, bufB]));
            if (res.type !== "ValidPackets") {
                throw new Error("Expected ValidPackets");
            }
            expect(res.packets.length).toEqual(1);
            expect(res.packets[0].data.toString("hex")).toEqual(bufA.toString("hex"));
            expect(res.bufferPacket.toString("hex")).toEqual(bufB.toString("hex"));
        });

    it("should correctly read one packet", () => {
        const bufA = new BufferWriter(3).packUInt16(3).packByte(0).data;
        const res = utils.getPacketsFromBuffer(bufA);
        if (res.type !== "ValidPackets") {
            throw new Error("Expected ValidPackets");
        }
        expect(res.packets.length).toEqual(1);
        expect(res.bufferPacket.length).toEqual(0);
        expect(res.packets[0].data.toString("hex")).toEqual(bufA.toString("hex"));
    });

    it("should correctly read packet", () => {
        const buf = new BufferWriter(4).packUInt16(4).packByte(0).packByte(0).data;
        const res = utils.getPacketsFromBuffer(buf);
        if (res.type !== "ValidPackets") {
            throw new Error("Expected ValidPackets");
        }
        expect(res.packets.length).toEqual(1);
        expect(res.bufferPacket.length).toEqual(0);
        expect(res.packets[0].data.toString("hex")).toEqual(buf.toString("hex"));
    });

    it("should correctly read packets", () => {
        const bufA = new BufferWriter(4).packUInt16(4).packByte(0).packByte(0).data;
        const bufB = new BufferWriter(4).packUInt16(4).packByte(0).packByte(0).data;
        const res = utils.getPacketsFromBuffer(Buffer.concat([bufA, bufB]));
        if (res.type !== "ValidPackets") {
            throw new Error("Expected ValidPackets");
        }
        expect(res.packets.length).toEqual(2);
        expect(res.bufferPacket.length).toEqual(0);
        expect(res.packets[0].data.toString("hex")).toEqual(bufA.toString("hex"));
        expect(res.packets[1].data.toString("hex")).toEqual(bufB.toString("hex"));
    });

    it("should correctly separate two packets", () => {
        const bufA = new BufferWriter(3).packUInt16(3).packByte(0).data;
        const bufB = new BufferWriter(3).packUInt16(3).packByte(1).data;
        const res = utils.getPacketsFromBuffer(Buffer.concat([bufA, bufB]));
        if (res.type !== "ValidPackets") {
            throw new Error("Expected ValidPackets");
        }
        expect(res.packets.length).toEqual(2);
        expect(res.bufferPacket.length).toEqual(0);
        expect(res.packets[0].data.toString("hex")).toEqual(bufA.toString("hex"));
        expect(res.packets[1].data.toString("hex")).toEqual(bufB.toString("hex"));
    });
});
