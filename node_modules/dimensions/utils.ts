/// <reference path="typings/index.d.ts" />
import * as path from 'path';
import * as util from 'util';
import Color from 'color';
import Packet from 'packet';

export interface BuffersPackets {
  bufferPacket: string;
  packets: Packet[];
}

export function hex2a(hexx: string): string {
  let hex: string = hexx.toString(); //force conversion
  let str: string = '';
  for (let i: number = 0; i < hex.length; i += 2)
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  return str;
}

export function a2hex(str: string): string {
  let arr: string[] = [];
  for (var i = 0, l = str.length; i < l; i++) {
    let prehex: string = Number(str.charCodeAt(i)).toString(16);
    let hex: string = prehex.length === 1 ? `0${prehex}` : prehex;
    arr.push(hex);
  }

  let builtString: string = arr.join('');

  // Must have even number of hex digits
  if (builtString.length % 2 !== 0) {
    builtString = "0" + builtString;
  }
  return builtString;
}

export function str2Hex(str: string): Buffer {
  return new Buffer(str, 'hex');
}

export function hex2str(hex: Buffer): string {
  return hex.toString("hex");
}

export function getProperIP(ip: string): string {
  let IPFromRequest: string = ip;
  let indexOfColon: number = IPFromRequest.lastIndexOf(':');
  let IP: string = IPFromRequest.substring(indexOfColon + 1, IPFromRequest.length);
  return IP;
}

export function getPacketLengthFromData(hexStr: string): string {
  let prePacketLength: string = (hexStr.length / 2).toString(16);
  if (prePacketLength.length !== 4) {
    for (let j: number = prePacketLength.length; j < 4; j++) {
      prePacketLength = "0" + prePacketLength;
    }
  }

  // Assign hex packet length
  let packetLength: string = (prePacketLength.length / 2 + parseInt(prePacketLength, 16)).toString(16);

  // Ensure it takes up 4 hex digits
  if (packetLength.length !== 4) {
    for (let j: number = packetLength.length; j < 4; j++) {
      packetLength = "0" + packetLength;
    }
  }

  // Reverse byte order
  let firstByte: string = packetLength.substr(0, 2);
  let secondByte: string = packetLength.substr(2, 2);
  packetLength = secondByte + firstByte + packetLength.substr(4);

  return packetLength;
}

export function getPacketTypeFromHexString(str: string): number {
  // Index 4, Length 2, Base 16
  return parseInt(str.substr(4, 2), 16);
}

export function getPacketsFromHexString(str: string): BuffersPackets {
  let packets: Packet[] = [];
  let end: boolean = false;
  let length: number;
  let data: string;
  let index: number = 0;
  let packetType: number;
  let bufferPacket: string = "";
  while (!end) {
    if (str.substr(index).length > 0) {
      //console.log(str.substr(index)+" - "+str.substr(index).length);
      // Length is *2 because we are parsing individual characters,
      // instead of individual bytes
      length = parseInt(str.substr(index + 2, 2) + str.substr(index, 2), 16) * 2;

      if (length === 0) {
        end = true;
      } else {
        data = str.substr(index, length);
        index += length;
        if (index > str.length) {
          //console.log("Index [" + index + "] exceeds data length [" + str.length + "]");
          bufferPacket = data;
        } else {
          packetType = getPacketTypeFromHexString(data);
          packets.push({
            packetType: packetType,
            data: data
          });
        }
      }
    } else {
      end = true;
    }
  }

  return { bufferPacket: bufferPacket, packets: packets };
}

/* Ensures a hex string is an even number of hex digits */
export function getCorrectHex(hexString: string): string {
    if (hexString.length % 2 !== 0) {
      hexString = "0" + hexString;
    }

    return hexString;
}

export class PacketFactory {
  packetData: string;

  constructor() {
    this.packetData = "0000";
  }

  setType(type: number): PacketFactory {
    let typeHex: string = (type).toString(16);
    // Length must be even
    if (typeHex.length % 2 !== 0) {
      typeHex = "0" + typeHex;
    }

    this.packetData = this.packetData.substr(0, 4) + typeHex + this.packetData.substr(6);
    this.updateLength();
    return this;
  }

  packString(str: string): PacketFactory {
    let strHex: string = a2hex(str);
    let sizeOfString: number = strHex.length / 2;
    let strLengthInHex: string;

    /* Sizes >= 128 require an extra byte (and maybe more but I doubt
        we will get bigger than strings of length 255*128) */
    if (sizeOfString >= 128) {
        strLengthInHex = getCorrectHex(((sizeOfString % 128)+128).toString(16)) + getCorrectHex(Math.floor(sizeOfString/128).toString(16));
    } else {
        strLengthInHex = getCorrectHex((strHex.length / 2).toString(16));
    }

    this.packetData += strLengthInHex + strHex;
    this.updateLength();
    return this;
  }

  packHex(hex: string): PacketFactory {
    this.packetData += hex;
    this.updateLength();
    return this;
  }

  packByte(byte: number): PacketFactory {
    // 2 hex digits
    let intHex: string = (byte).toString(16);
    if (intHex.length !== 2) {
      for (let j: number = intHex.length; j < 2; j++) {
        intHex = "0" + intHex;
      }
    }

    this.packetData += intHex;
    this.updateLength();
    return this;
  }

  packColor(color: Color): PacketFactory {
    // Not using packByte to avoid calling updateLength 2 times
    // more than necessary

    // Pack R
    let intHex: string = (color.R).toString(16);
    if (intHex.length !== 2) {
      for (let j: number = intHex.length; j < 2; j++) {
        intHex = "0" + intHex;
      }
    }

    this.packetData += intHex;

    // Pack G
    intHex = (color.G).toString(16);
    if (intHex.length !== 2) {
      for (let j: number = intHex.length; j < 2; j++) {
        intHex = "0" + intHex;
      }
    }

    this.packetData += intHex;

    // Pack B
    intHex = (color.B).toString(16);
    if (intHex.length !== 2) {
      for (let j: number = intHex.length; j < 2; j++) {
        intHex = "0" + intHex;
      }
    }

    this.packetData += intHex;
    this.updateLength();

    return this;
  }

  packInt16(int16: number): PacketFactory {
    // 4 hex digits
    var intHex = (int16).toString(16);
    if (intHex.length !== 4) {
      for (let j: number = intHex.length; j < 4; j++) {
        intHex = "0" + intHex;
      }
    }


    // Reverse byte order
    let firstByte: string = intHex.substr(0, 2);
    var secondByte: string = intHex.substr(2, 2);
    intHex = secondByte + firstByte;
    this.packetData += intHex;
    this.updateLength();
    return this;
  }

  packInt32(int32: number): PacketFactory {
    if (int32 < 0) {
      int32 = 4294967295;
    }

    let intHex: string = (int32).toString(16);
    if (intHex.length !== 8) {
      for (let j: number = intHex.length; j < 8; j++) {
        intHex = "0" + intHex;
      }
    }


    // Reverse byte order
    let firstByte: string = intHex.substr(0, 2);
    let secondByte: string = intHex.substr(2, 2);
    let thirdByte: string = intHex.substr(4, 2);
    let fourthByte: string = intHex.substr(6, 2);
    intHex = fourthByte + thirdByte + secondByte + firstByte;
    this.packetData += intHex;
    this.updateLength();
    return this;
  }

  packSingle(float: number): PacketFactory {
    let tempBuffer: Buffer = new Buffer(4);
    tempBuffer.writeFloatLE(float, 0);
    let single: string = tempBuffer.toString('hex');
    this.packetData += single;
    this.updateLength();
    return this;
  }

  updateLength(): void {
    this.packetData = getPacketLengthFromData(this.packetData.substr(4)) + this.packetData.substr(4);
  }

  data(): string {
    return this.packetData;
  }
}

export class ReadPacketFactory {
  packetData: string;
  type: number;

  constructor(data: string) {
    // Store data after length and type
    this.packetData = data.substr(6);
    this.type = parseInt(data.substr(4, 2), 16);
  }

  readByte(): number {
    // Read byte and convert to int
    let byte: number = parseInt(this.packetData.substr(0, 2), 16);

    // Chop off read data
    this.packetData = this.packetData.substr(2);

    return byte;
  }

  readColor(): Color {
    let color = {
      R: this.readByte(),
      G: this.readByte(),
      B: this.readByte()
    };

    return color;
  }

  readSByte(): number {
    let byte: number = parseInt(this.packetData.substr(0, 2), 16);

    // Chop off read data
    this.packetData = this.packetData.substr(2);

    let binaryValues: Object = {
      0: 1,
      1: 2,
      2: 4,
      3: 8,
      4: 16,
      5: 32,
      6: 64,
      7: 128
    };

    // Convert byte to signed
    let sbyte: number = 0;
    for (let i: number = 7; i >= 0; i--) {
      if ((byte & binaryValues[i]) === binaryValues[i]) {
        if (binaryValues[i] === 128) {
          sbyte = -128;
        } else {
          sbyte += binaryValues[i];
        }
      }
    }

    return sbyte;
  }

  readInt16(): number {
    // Read bytes
    let firstByte: string = this.packetData.substr(2, 2);
    let secondByte: string = this.packetData.substr(0, 2);

    // Convert to int
    let int16: number = parseInt(firstByte + secondByte, 16);

    // Chop off read data
    this.packetData = this.packetData.substr(4);

    return int16;
  }

  readInt32(): number {
    // Read bytes
    let firstByte: string = this.packetData.substr(6, 2);
    let secondByte: string = this.packetData.substr(4, 2);
    let thirdByte: string = this.packetData.substr(2, 2);
    let fourthByte: string = this.packetData.substr(0, 2);

    // Convert to int
    let int32: number = parseInt(firstByte + secondByte + thirdByte + fourthByte, 16);

    // Chop off read data
    this.packetData = this.packetData.substr(8);

    return int32;
  }

  readSingle(): number {
    // Get hex string
    let hex: string = this.packetData.substr(0, 8);

    // Use buffer to read Float
    let buf: Buffer = new Buffer(hex, 'hex');
    let single: number = buf.readFloatLE(0);

    // Chop off read data
    this.packetData = this.packetData.substr(8);

    return single;
  }

  readString(): string {
     // Read string length
      let firstByte: number = parseInt(this.packetData.substr(0, 2), 16);
      let strLength: number = firstByte;
      let digitOffset = 2;
      if (firstByte >= 128) {
          let secondByte: string = this.packetData.substr(2, 2);
          strLength = firstByte + (parseInt(secondByte, 16)-1)*128;
          digitOffset = 4;
      }

      // The used string length is in hex digits rather than characters
      strLength *= 2;

      // Read string content using length
      let strContent: string = hex2a(this.packetData.substr(digitOffset, strLength));

      // Chop off read data
      this.packetData = this.packetData.substr(digitOffset + strLength);
      return strContent;
  }
}

export function _invalidateRequireCacheForFile(filePath: string, require: NodeRequire) {
  var realPath = path.resolve(filePath);
  delete require.cache[realPath];
}

export function requireNoCache(filePath: string, require) {
  _invalidateRequireCacheForFile(filePath, require);
  return require(filePath);
}

let MathEx = {
  getRandomInt: function (min, max) {
    return Math.floor(Math.random() * ((max + 1) - min)) + min;
  }
}
