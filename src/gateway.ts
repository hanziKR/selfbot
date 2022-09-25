import WebSocket from "ws"
import zlib from "zlib-sync"
import erlpack from "erlpack"
import os from "os";

class Gateway {
    ws!: WebSocket;
    heartInterval: NodeJS.Timer | null;
    heartBeatTimeout: NodeJS.Timeout | null;
    sequenceNumber: number | null;
    sessionID: string | null;
    id: string | null;
    inflate: zlib.Inflate;
    token: string;
    callbacks: Map<string, (d: any, s: any, t: any) => void>;
    isDebug: boolean;

    openCallback: (() => void) | null;

    debug(text: string) {
        if (this.isDebug) {
            console.log(text);
        }
    }
    constructor(token: string, debugMode?: boolean) {
        this.isDebug = false;
        if (debugMode) {
            this.isDebug = true;
        }
        this.token = token;
        this.sequenceNumber = null;
        this.sessionID = null;
        this.heartBeatTimeout = null;
        this.heartInterval = null;
        this.id = null;
        this.inflate = new zlib.Inflate({
            chunkSize: 65535
        });
        this.openCallback = null;
        this.callbacks = new Map();
        this.initSocket();
    }
    initSocket() {
        this.ws = new WebSocket(
            "wss://gateway.discord.gg/?v=9&encoding=etf&compress=zlib-stream"
            // "wss://gateway.discord.gg/?v=9&encoding=json"
        );
        this.ws.on("open", () => {
            this.openCallback?.bind(this)();
        });
        this.ws.on("message", this.onMessage.bind(this));
    }
    heartbeat() {
        const heartbeatPacket = this.sequenceNumber;

        this.sendPacket(1, heartbeatPacket);

        this.heartBeatTimeout = setTimeout((() => {
            this.ws.close();
            this.initSocket();
        }).bind(this), 3000);

        this.debug("Heart beat!");
    }
    identifying() {
        const identifyingPacket = {
            token: this.token,
            intents: 131071,
            properties: {
                $os: process.platform,
                $browser: "node.js",
                $device: os.type(),
            }
        }
        this.sendPacket(2, identifyingPacket);

        this.debug("Identifying!");
    }
    resuming() {
        const resumingPacket = {
            token: this.token,
            session_id: this.sessionID,
            seq: this.sequenceNumber
        }
        this.sendPacket(6, resumingPacket);

        this.debug("Resuming!");
    }
    on(event: string, callback: (d: any, s: any, t: any) => void) {
        this.callbacks.set(event, callback);
    }
    onopen(callback: () => void) {
        this.openCallback = callback;
    }
    async onMessage(data: WebSocket.RawData) {
        const buffer = data as Buffer;
        this.inflate.push(buffer, zlib.Z_SYNC_FLUSH);

        const payload = erlpack.unpack(this.inflate.result as Buffer);
        const { op, d, s, t } = payload;

        if (s != null) {
            this.sequenceNumber = s;
        }

        switch (op) {
            case 10: {
                const heartbeat_interval: number = d.heartbeat_interval;

                if (this.sessionID != null) {
                    this.resuming();
                }
                else {
                    this.identifying();
                }

                this.heartInterval = setInterval(this.heartbeat.bind(this), heartbeat_interval);
                break;
            }
            case 0: {
                switch (t) {
                    case "READY": {
                        this.sessionID = d.session_id;
                        this.id = d.user.id;

                        this.debug("Ready!");

                        break;
                    }
                    default: {
                        this.debug(t);
                        const c = this.callbacks.get(t);
                        if (c) {
                            c(d, s, t);
                        }
                        break;
                    }
                }
                break;
            }
            case 9: {
                if (!d) {
                    this.sequenceNumber = null;
                    this.sessionID = null;
                    this.id = null;
                }
                this.ws.close();
                this.initSocket();
                break;
            }
            case 1: {
                this.heartbeat();
                break;
            }
            case 11: {
                if (this.heartBeatTimeout != null) {
                    clearTimeout(this.heartBeatTimeout);
                }
                break;
            }
        }
        // this.debug(payload);
    }
    sendPacket(op: number, d: any) {
        this.ws.send(erlpack.pack({ op, d }));
    }
}

export default Gateway;