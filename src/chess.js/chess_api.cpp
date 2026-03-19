#include <emscripten/bind.h>
#include <string>
#include <vector>

#include "sf/bitboard.h"
#include "sf/movegen.h"
#include "sf/position.h"

using namespace emscripten;
using namespace Stockfish;

static bool initialized = false;

class ChessGame {
public:
    ChessGame(const std::string& fen, bool isChess960) {
        if (!initialized) {
            __builtin_trap();
        }
        states   = StateListPtr(new std::deque<StateInfo>(1));
        this->err = pos.set(fen, isChess960, &states->back());
    }

    void reset(const std::string& fen, bool isChess960) {
        states->resize(1);
        this->err = pos.set(fen, isChess960, &states->back());
    }

    bool hasErr() const {
        return err.has_value();
    }

    std::string getErr() const {
        return err.has_value() ? *err : "";
    }

    std::string getSanMovesString() const {
        return std::string(sanMoves, sanMovesEnd - sanMoves);
    }

    /** Returns true if an error occurred, false otherwise. The converted result can be fetched with getSanMoves. Both LAN and SAN moves are accepted as input. */
    bool playMoves(const std::string& moves, bool emitLAN = false) {
        err = std::nullopt;

        // istringstream is slop and slow
        const char* read = moves.data();

        auto read_square = [&] () -> std::optional<Square> {
            int file = *read - 'a';
            if (file < 0 || file >= 8) return std::nullopt;
            read++;

            int rank = *read - '1';
            if (rank < 0 || rank >= 8) return std::nullopt;
            read++;

            return make_square(File(file), Rank(rank));
        };

        sanMovesEnd = sanMoves;

        for (;;) {
            char c = *read;
            if (c == '\0') break;

            if (c == ' ' || c == '\t' || c == '\n') { read++; continue; }

            auto sq1 = read_square();
            auto sq2 = read_square();
            if (!sq1.has_value() || !sq2.has_value()) {
                err = "Failed to read UCI move at " + std::to_string(read - moves.data());
                return true;
            }

            PieceType promo = NO_PIECE_TYPE;
            if (*read == 'n' || *read == 'b' || *read == 'r' || *read == 'q') {
                constexpr PieceType promoMap[26] = {
                    [0] = NO_PIECE_TYPE, ['b'-'a'] = BISHOP, ['n'-'a'] = KNIGHT,
                    ['q'-'a'] = QUEEN, ['r'-'a'] = ROOK,
                };
                promo = promoMap[*read - 'a'];
                read++;
            }

            Move selected = Move::none();
            auto legal = MoveList<LEGAL>(pos);

            // Accept >1 king moves in either direction as castling, but SF encodes castling as king captures rook
            bool putativelyCastling = type_of(pos.piece_on(*sq1)) == KING &&
               std::abs(file_of(*sq1) - file_of(*sq2)) >= 2 &&
               rank_of(*sq1) == rank_of(*sq2);
            for (const auto& m : legal) {
                if (m.from_sq() == *sq1 && m.to_sq() == *sq2
                    && (promo == NO_PIECE_TYPE || m.promotion_type() == promo)) {
                    selected = m;
                    break;
                }

                if (putativelyCastling && m.type_of() == CASTLING && m.from_sq() == *sq1 && (*sq2 > *sq1) == (m.to_sq() > m.from_sq())) {
                    selected = m;  // :like:
                    break;
                }
            }

            if (selected == Move::none()) {
                err = std::string("Illegal move: ")
                    + char('a' + file_of(*sq1)) + char('1' + rank_of(*sq1))
                    + char('a' + file_of(*sq2)) + char('1' + rank_of(*sq2));
                return true;
            }

            if (sanMovesEnd != sanMoves)
                *sanMovesEnd++ = ' ';

            constexpr char pieceChar[] = " PNBRQK";
            Square from = selected.from_sq(), to = selected.to_sq();
            PieceType pt = type_of(pos.piece_on(from));

            if (selected.type_of() == CASTLING) {
                bool kingside = file_of(to) > file_of(from);
                if (kingside) { *sanMovesEnd++ = 'O'; *sanMovesEnd++ = '-'; *sanMovesEnd++ = 'O'; }
                else          { *sanMovesEnd++ = 'O'; *sanMovesEnd++ = '-'; *sanMovesEnd++ = 'O'; *sanMovesEnd++ = '-'; *sanMovesEnd++ = 'O'; }
            } else {
                bool capture = pos.capture(selected);

                if (pt != PAWN) {
                    *sanMovesEnd++ = pieceChar[pt];

                    // Disambiguation
                    Bitboard others = 0;
                    for (const auto& m : legal) {
                        if (m != selected && type_of(pos.piece_on(m.from_sq())) == pt
                            && m.to_sq() == to)
                            others |= square_bb(m.from_sq());
                    }
                    if (others) {
                        if (!(others & file_bb(from)))
                            *sanMovesEnd++ = char('a' + file_of(from));
                        else if (!(others & rank_bb(from)))
                            *sanMovesEnd++ = char('1' + rank_of(from));
                        else {
                            *sanMovesEnd++ = char('a' + file_of(from));
                            *sanMovesEnd++ = char('1' + rank_of(from));
                        }
                    }
                } else if (capture) {
                    *sanMovesEnd++ = char('a' + file_of(from));
                }

                if (capture)
                    *sanMovesEnd++ = 'x';

                *sanMovesEnd++ = char('a' + file_of(to));
                *sanMovesEnd++ = char('1' + rank_of(to));

                if (selected.type_of() == PROMOTION) {
                    *sanMovesEnd++ = '=';
                    *sanMovesEnd++ = pieceChar[selected.promotion_type()];
                }
            }

            states->emplace_back();
            pos.do_move(selected, states->back());

            if (pos.checkers()) {
                if (MoveList<LEGAL>(pos).size() == 0)
                    *sanMovesEnd++ = '#';
                else
                    *sanMovesEnd++ = '+';
            }

            *sanMovesEnd = '\0';
        }
        return false;
    }

    std::string fenAt(int index) const {
        // :poop:
        return "";
    }

    std::string moveAt(int index) const {
        // :poop:
        return "";
    }

private:
    Position pos;
    StateListPtr states;

    std::optional<std::string> err;
    char *sanMovesEnd;
    char sanMoves[100000];
};

void initChess() {
    if (initialized)
        return;
    initialized = true;
    Bitboards::init();
    Position::init();
}

EMSCRIPTEN_BINDINGS(chess_module) {
    function("initChess", &initChess);

    class_<ChessGame>("ChessGame")
        .constructor<std::string, bool>()
        .function("reset", &ChessGame::reset)
        .function("hasErr", &ChessGame::hasErr)
        .function("getErr", &ChessGame::getErr)
        .function("playMoves", &ChessGame::playMoves)
        .function("getSanMovesString", &ChessGame::getSanMovesString)
        .function("fenAt", &ChessGame::fenAt)
        .function("moveAt", &ChessGame::moveAt);
}
