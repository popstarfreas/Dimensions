class BitsByte extends Array {
    protected _value: number;

    constructor(value: number) {
        super(8);
        this._value = value;

        // Assign each flag to an index
        for (let i = 0; i < 8; i++) {
            this[i] = ((value >> i) & 1) == 1;
        }
    }

    public get value(): number {
        this._value = this[0] ? this._value | 1 : this._value;
        this._value = this[1] ? this._value | 2 : this._value;
        this._value = this[2] ? this._value | 4 : this._value;
        this._value = this[3] ? this._value | 8 : this._value;
        this._value = this[4] ? this._value | 16 : this._value;
        this._value = this[5] ? this._value | 32 : this._value;
        this._value = this[6] ? this._value | 64 : this._value;
        this._value = this[7] ? this._value | 128 : this._value;
        return this._value;
    }
}

export default BitsByte;