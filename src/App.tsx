import { Chessground } from '@lichess-org/chessground'
import { Chess, Move, type Square } from 'chess.js'
import { useEffect, useRef, useState } from 'react'
import { CCCWebSocket } from './websocket'
import type { Api } from '@lichess-org/chessground/api'
import type { CCCLiveInfo, CCCEngine, CCCMessage, CCCEventUpdate, CCCEventsListUpdate, CCCClocks } from './types'
import type { DrawShape } from '@lichess-org/chessground/draw'
import { CategoryScale, Chart, Legend, LinearScale, LineElement, PointElement, Title, Tooltip } from 'chart.js'
import { EngineComponent } from './components/EngineComponent'
import { StandingsTable } from './components/StandingsTable'
import { GameGraph } from './components/GameGraph'
import type { Config } from '@lichess-org/chessground/config'
import { ScheduleComponent } from './components/ScheduleComponent'
import './App.css'

const CLOCK_UPDATE_MS = 25

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

function App() {

    const boardElementRef = useRef<HTMLDivElement>(null)
    const boardRef = useRef<Api>(null)
    const whiteArrow = useRef<[DrawShape, DrawShape]>(null)
    const blackArrow = useRef<[DrawShape, DrawShape]>(null)
    const game = useRef(new Chess())
    const ws = useRef(new CCCWebSocket("wss://ccc-api.gcp-prod.chess.com/ws"))

    const [_, setCccEventList] = useState<CCCEventsListUpdate>()
    const [cccEvent, setCccEvent] = useState<CCCEventUpdate>()
    const [clocks, setClocks] = useState<CCCClocks>()

    const [liveInfosWhite, setLiveInfosWhite] = useState<(CCCLiveInfo | undefined)[]>([])
    const [liveInfosBlack, setLiveInfosBlack] = useState<(CCCLiveInfo | undefined)[]>([])

    function updateBoard(lastMove: [Square, Square], arrowsOnly: boolean = false) {
        const arrows: DrawShape[] = []
        if (whiteArrow.current)
            arrows.push(whiteArrow.current[0])
        if (blackArrow.current)
            arrows.push(blackArrow.current[0])

        let config: Config = {
            drawable: {
                // @ts-ignore
                brushes: {
                    white: {
                        key: "white",
                        color: "#fff",
                        opacity: 0.7,
                        lineWidth: 10,
                    },
                    black: {
                        key: "black",
                        color: "#000",
                        opacity: 0.7,
                        lineWidth: 10,
                    }
                },
                enabled: false,
                eraseOnMovablePieceClick: false,
                shapes: arrows,
            }
        }

        if (!arrowsOnly) {
            config.fen = game.current.fen()
            config.lastMove = lastMove
        }

        requestAnimationFrame(() => boardRef.current?.set(config))
    }

    function updateClocks() {
        setClocks(currentClock => {
            if (!currentClock) return currentClock

            let wtime = Number(currentClock.wtime)
            let btime = Number(currentClock.btime)

            if (game.current.turn() == "w")
                wtime -= CLOCK_UPDATE_MS
            else
                btime -= CLOCK_UPDATE_MS

            return {
                ...currentClock,
                wtime: String(wtime),
                btime: String(btime),
            }
        })
    }

    function handleMessage(msg: CCCMessage) {
        let lastMove: Move

        switch (msg.type) {

            case "eventUpdate":
                setCccEvent(msg)
                break

            case "gameUpdate":
                whiteArrow.current = null
                blackArrow.current = null

                game.current.loadPgn(msg.gameDetails.pgn)
                lastMove = game.current.history({ verbose: true }).at(-1)!!
                updateBoard([lastMove.from, lastMove.to])

                const liveInfosWhite: (CCCLiveInfo | undefined)[] = []
                const liveInfosBlack: (CCCLiveInfo | undefined)[] = []
                game.current.getComments().forEach((value, i) => {
                    const data = value.comment.split(", ")

                    if (data[0] === "book") return

                    let score = data[0].split("/")[0]
                    if (i % 2 === 1) {
                        if (score.includes("+"))
                            score = score.replace("+", "-")
                        else
                            score = score.replace("-", "+")
                    }

                    const liveInfo: CCCLiveInfo = {
                        type: "liveInfo",
                        info: {
                            color: i % 2 === 0 ? "w" : "b",
                            depth: data[0].split("/")[1].split(" ")[0],
                            multipv: "1",
                            hashfull: data[6].split("=")[1],
                            name: "",
                            nodes: data[3].split("=")[1],
                            ply: i + 1,
                            pv: "",
                            score,
                            seldepth: data[4].split("=")[1],
                            speed: data[5].split("=")[1],
                            tbhits: data[7].split("=")[1],
                            time: data[0].split(" ")[1].split("s")[0].replace(".", ""),
                        }
                    }
                    if (i % 2 === 0)
                        liveInfosWhite[liveInfo.info.ply] = liveInfo
                    else
                        liveInfosBlack[liveInfo.info.ply] = liveInfo
                })

                setLiveInfosWhite(liveInfosWhite)
                setLiveInfosBlack(liveInfosBlack)

                break;

            case "liveInfo":
                const pv = msg.info.pv.split(" ")
                const nextMove = pv[0]
                const secondNextMove = pv.length > 1 ? pv[1] : pv[0]
                const arrow: [DrawShape, DrawShape] = [
                    { orig: nextMove.slice(0, 2) as Square || "a1", dest: nextMove.slice(2, 4) as Square || "a1", brush: msg.info.color },
                    { orig: secondNextMove.slice(0, 2) as Square || "a1", dest: secondNextMove.slice(2, 4) as Square || "a1", brush: msg.info.color },
                ]

                if (msg.info.color == "white") {
                    setLiveInfosWhite(data => {
                        const newData = [...data]
                        newData[msg.info.ply] = msg
                        return newData
                    })
                    whiteArrow.current = arrow
                }
                else {
                    setLiveInfosBlack(data => {
                        const newData = [...data]
                        newData[msg.info.ply] = msg
                        return newData
                    })
                    blackArrow.current = arrow
                }

                lastMove = game.current.history({ verbose: true }).at(-1)!!
                updateBoard([lastMove.from, lastMove.to], true)

                break;

            case "eventsListUpdate":
                setCccEventList(msg)
                break;

            case "clocks":
                setClocks(msg)
                break;

            case "newMove":
                const from = msg.move.slice(0, 2) as Square
                const to = msg.move.slice(2, 4) as Square
                const promo = msg.move?.[4]

                if (game.current.turn() == "w" && whiteArrow.current) {
                    whiteArrow.current = [whiteArrow.current[1], whiteArrow.current[0]]
                } else if (blackArrow.current) {
                    blackArrow.current = [blackArrow.current[1], blackArrow.current[0]]
                }

                game.current.move({ from, to, promotion: promo as any })
                updateBoard([from, to])

                break
        }
    }

    function requestEvent(gameNr?: string, eventNr?: string) {
        let message: any = { type: "requestEvent" }
        if (gameNr) message["gameNr"] = gameNr
        if (eventNr) message["enr"] = eventNr

        ws.current.send(message)
    }

    useEffect(() => {
        if (boardRef.current || !boardElementRef.current) return;

        boardRef.current = Chessground(boardElementRef.current, {
            fen: game.current.fen(),
            orientation: 'white',
            movable: { free: false, color: undefined, dests: undefined },
            selectable: { enabled: false },
        })

        ws.current.connect(handleMessage)
        return () => ws.current.disconnect()
    }, [boardElementRef.current])

    useEffect(() => {
        const clockTimer = setInterval(updateClocks, CLOCK_UPDATE_MS)
        return () => clearInterval(clockTimer)
    }, [])

    const latestLiveInfoBlack = liveInfosBlack.at(-1)
    const latestLiveInfoWhite = liveInfosWhite.at(-1)

    const engines = cccEvent?.tournamentDetails.engines ?? []
    const white = engines.find(engine => engine.name === game.current.getHeaders()["White"])
    const black = engines.find(engine => engine.name === game.current.getHeaders()["Black"])

    return (
        <div className="app">

            <div className="boardWindow">
                {latestLiveInfoBlack && black && clocks && <EngineComponent info={latestLiveInfoBlack} engine={black} time={Number(clocks.btime)} />}

                <div ref={boardElementRef} className="board"></div>

                {latestLiveInfoWhite && white && clocks && <EngineComponent info={latestLiveInfoWhite} engine={white} time={Number(clocks.wtime)} />}
            </div>

            {white && black && <div className="standingsWindow">
                <h2>Standings</h2>
                <StandingsTable engines={engines} />
                <GameGraph black={black} white={white} liveInfosBlack={liveInfosBlack} liveInfosWhite={liveInfosWhite} />
            </div>}

            {cccEvent && <div className="scheduleWindow">
                <h2>Schedule</h2>
                <ScheduleComponent event={cccEvent} engines={engines} requestEvent={requestEvent} />
            </div>}

        </div>
    )
}

export default App
