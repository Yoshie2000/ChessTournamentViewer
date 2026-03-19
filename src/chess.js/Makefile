CXX = em++
CXXFLAGS = -O3 -std=c++17 -flto -DNDEBUG
LDFLAGS = -flto -lembind -s MODULARIZE=1 -s EXPORT_ES6=1 -s EXPORT_NAME=ChessModule -s ALLOW_MEMORY_GROWTH=1 -s STACK_SIZE=1048576 --emit-tsd chess_api.d.ts

SRC = chess_api.cpp sf/bitboard.cpp sf/misc.cpp sf/movegen.cpp sf/position.cpp
OUT = chess_api.js

all: $(OUT)

$(OUT): $(SRC)
	$(CXX) $(CXXFLAGS) $(LDFLAGS) -o $@ $^

clean:
	rm -f chess_api.js chess_api.wasm chess_api.d.ts