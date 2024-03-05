import BlackList from 'dimensions/blacklist';
let Mitm = require('mitm');

type DoneFn = () => void;
describe("blacklist", () => {
    let mitm: any;
    let blacklist = new BlackList();

    beforeEach(() => {
        mitm = Mitm();
        blacklist = new BlackList();
    });

    afterEach(() => {
        mitm.disable();
    });

    it("should return false when an ip is not blocked", (done: DoneFn) => {
        mitm.on("request", (_req: any, res: any) => {
            let response = JSON.stringify({
                status: "success",
                "host-ip": false
            });
            res.statusCode = 200;
            res.end(response);
        });

        blacklist.checkIP("127.0.0.1", "").then((isHostIp) => {
            expect(isHostIp).toBe(false);
            done();
        }).catch((e) => {
            expect(e).toBeNull();
            done();
        });
    });

    it("should return true when an ip not blocked", (done: DoneFn) => {
        mitm.on("request", (_req: any, res: any) => {
            let response = JSON.stringify({
                status: "success",
                "host-ip": true
            });
            res.statusCode = 200;
            res.end(response);
        });

        blacklist.checkIP("127.0.0.1", "").then((isHostIp) => {
            expect(isHostIp).toBe(true);
            done();
        }).catch((e) => {
            expect(e).toBeNull();
            done();
        });
    });

    it("should error when the request was not successful", (done: DoneFn) => {
        mitm.on("request", (_req: any, res: any) => {
            let response = JSON.stringify({
                status: "failure",
                "host-ip": false
            });
            res.statusCode = 200;
            res.end(response);
        });

        blacklist.checkIP("127.0.0.1", "").then((isHostIp) => {
            expect(isHostIp).toBeNull();
            done();
        }).catch((e) => {
            expect(e).toEqual(jasmine.any(Error));
            done();
        });
    });

    it("should error when the request response is malformed", (done: DoneFn) => {
        mitm.on("request", (_req: any, res: any) => {
            res.statusCode = 200;
            res.end("{asda;g.pdg,");
        });

        blacklist.checkIP("127.0.0.1", "").then((isHostIp) => {
            expect(isHostIp).toBeNull();
            done();
        }).catch((e) => {
            expect(e).toEqual(jasmine.any(Error));
            done();
        });
    });
});
