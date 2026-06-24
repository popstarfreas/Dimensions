import { EventEmitter } from 'events';
import * as fs from 'node:fs';
import type { ClientRequest, IncomingMessage } from 'node:http';
import type { RequestOptions } from 'node:https';
import * as path from 'node:path';
import Blacklist from '../../dimensions/blacklist.js';
import type { EnabledBlackList } from '../../dimensions/configloader.js';

type HttpsGet = typeof import('node:https').get;

describe("Blacklist", () => {
    class FakeRequest extends EventEmitter {
        destroy(error?: Error): this {
            if (error) {
                this.emit("error", error);
            }

            return this;
        }
    }

    class FakeResponse extends EventEmitter {
    }

    function makeConfig(): EnabledBlackList {
        return {
            enabled: true,
            hostname: "blacklist.example.test",
            path: "/blacklisted",
            port: 443,
            apiKey: "secret-token",
            errorPolicy: "DenyJoining"
        };
    }

    function makeHttpsGet(responseBody: string, capturedRequests: RequestOptions[]): HttpsGet {
        return ((options: RequestOptions | string | URL, callback?: (res: IncomingMessage) => void) => {
            if (typeof options !== "object" || options instanceof URL) {
                throw new Error("Expected blacklist request to use request options");
            }

            capturedRequests.push(options);
            const request = new FakeRequest();
            const response = new FakeResponse();

            queueMicrotask(() => {
                callback?.(response as IncomingMessage);
                response.emit("data", Buffer.from(responseBody));
                response.emit("end");
            });

            return request as ClientRequest;
        }) as HttpsGet;
    }

    async function expectRejects(promise: Promise<unknown>, message?: string): Promise<void> {
        let rejection: unknown;
        try {
            await promise;
        } catch (e) {
            rejection = e;
        }

        expect(rejection).toEqual(jasmine.any(Error));
        if (typeof message !== "undefined") {
            expect((rejection as Error).message).toContain(message);
        }
    }

    it("sends blacklist checks over HTTPS with the token header and encoded player metadata", async () => {
        const capturedRequests: RequestOptions[] = [];
        const blacklist = new Blacklist(makeConfig(), makeHttpsGet(JSON.stringify(["Ok", { isBlacklisted: false }]), capturedRequests));

        const isBlacklisted = await blacklist.checkInformation("Alice & Bob", "203.0.113.5", "uuid/value?");

        expect(isBlacklisted).toBeFalse();
        expect(capturedRequests.length).toBe(1);
        const requestOptions = capturedRequests[0];
        expect(requestOptions.protocol).toBe("https:");
        expect(requestOptions.hostname).toBe("blacklist.example.test");
        expect(requestOptions.port).toBe(443);
        expect(requestOptions.headers).toEqual({ token: "secret-token" });

        const requestUrl = new URL(requestOptions.path!, "https://blacklist.example.test");
        expect(requestUrl.pathname).toBe("/blacklisted");
        expect(requestUrl.searchParams.get("name")).toBe("Alice & Bob");
        expect(requestUrl.searchParams.get("ip")).toBe("203.0.113.5");
        expect(requestUrl.searchParams.get("uuid")).toBe("uuid/value?");
    });

    it("resolves true when the blacklist response marks the client as blacklisted", async () => {
        const blacklist = new Blacklist(makeConfig(), makeHttpsGet(JSON.stringify(["Ok", { isBlacklisted: true }]), []));

        await expectAsync(blacklist.checkInformation("Smekku", "127.0.0.1", "uuid")).toBeResolvedTo(true);
    });

    it("rejects forbidden responses", async () => {
        const blacklist = new Blacklist(makeConfig(), makeHttpsGet(JSON.stringify(["Forbidden"]), []));

        await expectRejects(blacklist.checkInformation("Smekku", "127.0.0.1", "uuid"), "Invalid token");
    });

    it("rejects malformed JSON responses", async () => {
        const blacklist = new Blacklist(makeConfig(), makeHttpsGet("not json", []));

        await expectRejects(blacklist.checkInformation("Smekku", "127.0.0.1", "uuid"));
    });

    it("does not use plaintext HTTP transport in the blacklist implementation", () => {
        const source = fs.readFileSync(path.resolve(process.cwd(), "app/dimensions/blacklist.ts"), "utf8");

        expect(source).not.toContain("http.get");
        expect(source).not.toContain("protocol: 'http'");
        expect(source).not.toContain('protocol: "http"');
        expect(source).not.toContain("rejectUnauthorized: false");
    });
});
