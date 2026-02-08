import type { CCCMessage } from "./types"

export class CCCWebSocket {

    private url: string
    private ws: WebSocket | null = null

    constructor(url: string) {
        this.url = url
    }

    connect(onMessage: (message: CCCMessage) => void) {

        this.ws = new WebSocket(this.url)

        this.ws.onopen = () => {
            this.send({ type: "requestEvent" })
            this.send({ type: "requestEventsListUpdate" })
        }

        this.ws.onmessage = e => {
            const messages = JSON.parse(e.data)
            for (const msg of messages)
                onMessage(msg)
        }

        this.ws.onclose = () => {
            console.log('ws closed')
            this.ws = null
            setTimeout(() => this.connect(onMessage), 1000)
        }

        this.ws.onerror = () => {
            this.ws?.close()
        }
    }

    disconnect() {
        this.ws?.close();
    }

    send(msg: unknown) {
        console.log(msg)
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
        this.ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg))
    }
}