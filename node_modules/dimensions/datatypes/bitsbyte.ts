class BitsByte extends Array {
    protected _value: number;

    constructor(value: number) {
        super(8);
        this._value = value;
        
        // Assign each flag to an index
        this[0] = (value & 1) == 1;
        this[1] = (value & 2) == 2;
        this[2] = (value & 4) == 4;
        this[3] = (value & 8) == 8;
        this[4] = (value & 16) == 16;
        this[5] = (value & 32) == 32;
        this[6] = (value & 64) == 64;
        this[7] = (value & 128) == 128;
    }

    public get value(): number {
        return this._value;
    }
}

export default BitsByte;