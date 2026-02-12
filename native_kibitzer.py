import asyncio
from websockets.asyncio.server import serve
from websockets.exceptions import ConnectionClosed
from subprocess import Popen, PIPE
import os

ENGINE_PATH = "/home/patrick/ChessProgramming/PlentyChess/engine"


class EngineManager:
    def __init__(self):
        self.active_task = None
        self.active_engine = None

    async def handler(self, websocket):
        if self.active_task and not self.active_task.done():
            print("New client connected. Terminating old session...")
            self.active_task.cancel()
            if self.active_engine:
                self.active_engine.terminate()

        self.active_task = asyncio.current_task()

        print(f"Starting engine: {ENGINE_PATH}")
        self.active_engine = Popen(
            [ENGINE_PATH],
            stdout=PIPE, stdin=PIPE, stderr=PIPE,
            text=True, bufsize=1
        )

        try:
            await asyncio.gather(
                self.engine_to_ws(self.active_engine, websocket),
                self.ws_to_engine(self.active_engine, websocket)
            )
        except asyncio.CancelledError:
            print("Session cancelled by new connection.")
        finally:
            self.cleanup()

    async def engine_to_ws(self, engine, websocket):
        loop = asyncio.get_event_loop()
        try:
            while True:
                line = await loop.run_in_executor(None, engine.stdout.readline)
                if not line:
                    break

                if "info depth" not in line:
                    print(f"> {line.strip()}")

                await websocket.send(line.strip())
        except (ConnectionClosed, asyncio.CancelledError):
            pass

    async def ws_to_engine(self, engine, websocket):
        try:
            async for message in websocket:
                print(f"< {message}")
                engine.stdin.write(f"{message}\n")
                engine.stdin.flush()
        except (ConnectionClosed, asyncio.CancelledError):
            pass

    def cleanup(self):
        if self.active_engine:
            self.active_engine.terminate()
            try:
                self.active_engine.wait(timeout=1)
            except:
                self.active_engine.kill()
            self.active_engine = None
            print("Engine process cleaned up.")


manager = EngineManager()


async def main():
    async with serve(manager.handler, "localhost", 7654) as server:
        print("Server active on ws://localhost:7654")
        await server.serve_forever()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        manager.cleanup()
