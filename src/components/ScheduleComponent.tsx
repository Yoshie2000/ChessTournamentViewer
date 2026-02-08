import { useEffect, useRef } from "react"
import type { CCCEngine, CCCEventUpdate } from "../types"
import { EngineLogo } from "./EngineLogo"
import "./ScheduleComponent.css"

type ScheduleComponentProps = {
    engines: CCCEngine[]
    event: CCCEventUpdate
    requestEvent: (gameNr: string) => void
}

export function ScheduleComponent({ engines, event, requestEvent }: ScheduleComponentProps) {

    const scheduleRef = useRef<HTMLDivElement>(null)
    const currentGameRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!scheduleRef.current || !currentGameRef.current) return

        scheduleRef.current.scrollTop = currentGameRef.current.offsetTop
    }, [scheduleRef.current, currentGameRef.current])

    return (
        <div className="schedule" ref={scheduleRef}>
            {event.tournamentDetails.schedule.past.map((game, i) => {
                const gameWhite = engines.find(engine => engine.id === game.whiteId)!!
                const gameBlack = engines.find(engine => engine.id === game.blackId)!!
                const whiteClass = game.outcome === "1-0" ? "winner" : game.outcome === "0-1" ? "loser" : "draw";
                const blackClass = game.outcome === "1-0" ? "loser" : game.outcome === "0-1" ? "winner" : "draw";
                return (
                    <div className="game" key={game.gameNr} onClick={() => requestEvent(game.gameNr)}>
                        <span className="round">#{i + 1}</span>
                        <EngineLogo engine={gameWhite} />
                        <span className={"engineName " + whiteClass}>{gameWhite.name}</span>
                        <span>vs.</span>
                        <span className={"engineName " + blackClass}>{gameBlack.name}</span>
                        <EngineLogo engine={gameBlack} />
                    </div>
                )
            })}
            {[event.tournamentDetails.schedule.present].map((game, i) => {
                const gameWhite = engines.find(engine => engine.id === game.whiteId)!!
                const gameBlack = engines.find(engine => engine.id === game.blackId)!!
                return (
                    <div className="game active" key={game.gameNr} ref={currentGameRef} onClick={() => requestEvent(game.gameNr)}>
                        <span className="round">#{event.tournamentDetails.schedule.past.length + i + 1}</span>
                        <EngineLogo engine={gameWhite} />
                        <span className={"engineName"}>{gameWhite.name}</span>
                        <span>vs.</span>
                        <span className={"engineName"}>{gameBlack.name}</span>
                        <EngineLogo engine={gameBlack} />
                    </div>
                )
            })}
            {event.tournamentDetails.schedule.future.map((game, i) => {
                const gameWhite = engines.find(engine => engine.id === game.whiteId)!!
                const gameBlack = engines.find(engine => engine.id === game.blackId)!!
                return (
                    <div className="game" key={game.gameNr} onClick={() => requestEvent(game.gameNr)}>
                        <span className="round">#{event.tournamentDetails.schedule.past.length + i + 2}</span>
                        <EngineLogo engine={gameWhite} />
                        <span className={"engineName"}>{gameWhite.name}</span>
                        <span>vs.</span>
                        <span className={"engineName"}>{gameBlack.name}</span>
                        <EngineLogo engine={gameBlack} />
                    </div>
                )
            })}
        </div>
    )
}