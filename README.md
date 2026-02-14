# Project setup
```
bash setup_wasm_stockfish.sh
npm install
npm run dev
```

# Credits
- @AndyGrant for showing me how to use the CCC websocket
- @Styxdoto for design inspiration

# Acknowledgements

This project includes the source code of [chess.js](https://github.com/jhlywa/chess.js) in `src/chess.js` in order to provide [the Chess960 / Fischer Random support introduced in this PR](https://github.com/jhlywa/chess.js/pull/575). All code in `src/chess.js` belongs to the [chess.js](https://github.com/jhlywa/chess.js) authors, please see the license in `src/chess.js/chess.ts` for the details. The files `src/chess.js/pgn.js` and `src/chess.js/pgn.d.ts` have been generated from the `chess.js` repository using `peggy`.