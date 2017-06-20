class NetworkText {
    private _mode: number;
    private _text: string;

    constructor(mode: number, text: string) {
        this._mode = mode;
        this._text = text;
    }

    public get mode(): number {
        return this._mode;
    }

    public get text(): string {
        return this._text;
    }

    public toString(): string {
        return this._text;
    }
}

export default NetworkText;