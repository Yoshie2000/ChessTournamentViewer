const StartPos = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

async function main() {
    const ChessModule = (await import("./chess_api.js")).default;
    const Module = await ChessModule();

    Module.initChess();

    const game = new Module.ChessGame(StartPos, true);
    assert(!game.hasErr(), "game.hasErr()");

    let err = game.playMoves("e2e4 e7e5 g1f3", false);
    assert(!err, game.getErr());

    let san = game.getSanMovesString();
    assert(san === "e4 e5 Nf3", "Huh: " + san);

    err = game.playMoves("e2e4 e7e5 g1f3", false);
    assert(err, "no error?? wtf");

    console.time("start");
    for (let i = 0; i < 100000; ++i) {
        game.reset(StartPos, false);
        err = game.playMoves("e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 b2b4 c5b4 c2c3 b4a5 d2d4 e5d4 e1g1 d4d3 d1b3 d8f6 e4e5 f6g6 f1e1 g8e7 c1a3 b7b5 b3b5 a8b8 b5a4 a5b6 b1d2 c8b7 d2e4 g6f5 c4d3 f5h5 e4f6 g7f6 e5f6 h8g8 a1d1 h5f3 e1e7 c6e7 a4d7 e8d7 d3f5 d7e8 f5d7 e8f8 a3e7", false)
        assert(!err, game.getErr());

        san = game.getSanMovesString();
        assert(san === "e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O d3 Qb3 Qf6 e5 Qg6 Re1 Nge7 Ba3 b5 Qxb5 Rb8 Qa4 Bb6 Nbd2 Bb7 Ne4 Qf5 Bxd3 Qh5 Nf6+ gxf6 exf6 Rg8 Rad1 Qxf3 Rxe7+ Nxe7 Qxd7+ Kxd7 Bf5+ Ke8 Bd7+ Kf8 Bxe7#", san)
    }
    console.timeEnd("start");

    game.delete();
}

function assert(condition: boolean, msg: string) {
    if (!condition) {
        throw new Error(`Assertion failed: ${msg}`);
    }
}

main().catch((e) => {
    console.error(e);
});