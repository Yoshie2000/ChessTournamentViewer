#!/bin/bash
set -e
tmp=$(mktemp -d)
npm pack stockfish@19 --pack-destination "$tmp"
tar xzf "$tmp"/stockfish-19.0.0.tgz -C "$tmp"
cp "$tmp"/package/bin/stockfish-19-single.{js,wasm} public
rm -rf "$tmp"