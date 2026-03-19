#include <emscripten/bind.h>
#include <string>
#include <vector>

#include "sf/bitboard.h"
#include "sf/movegen.h"
#include "sf/position.h"

using namespace emscripten;
using namespace Stockfish;

static bool initialized = false;

bool isspace(char c) {
    return c == '\n' || c == '\t' || c == ' ';
}

constexpr PieceType promoMap[26] = {
    [0] = NO_PIECE_TYPE, ['b'-'a'] = BISHOP, ['n'-'a'] = KNIGHT,
    ['q'-'a'] = QUEEN, ['r'-'a'] = ROOK,
};

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

    /** Returns true if an error occurred, false otherwise. The converted result can be fetched with getSanMovesString. Both LAN and SAN moves are accepted as input. */
    bool playMoves(const std::string& moves, bool emitLAN) {
        err = std::nullopt;
        const char* read = moves.data();
        constexpr char pieceChar[] = " PNBRQK";

        auto peek_file = [&] () -> std::optional<File> {
            int f = *read - 'a';
            if (f < 0 || f >= 8) return std::nullopt;
            return File(f);
        };

        auto peek_rank = [&] () -> std::optional<Rank> {
            int r = *read - '1';
            if (r < 0 || r >= 8) return std::nullopt;
            return Rank(r);
        };

        auto eat_file = [&] () -> std::optional<File> {
            auto f = peek_file();
            if (f) read++;
            return f;
        };

        auto eat_rank = [&] () -> std::optional<Rank> {
            auto r = peek_rank();
            if (r) read++;
            return r;
        };

        auto eat_square = [&] () -> std::optional<Square> {
            auto f = eat_file();
            if (!f) return std::nullopt;
            auto r = eat_rank();
            if (!r) { read--; return std::nullopt; } // put back the file
            return make_square(*f, *r);
        };

        sanMovesEnd = sanMoves;

        for (;;) {
            while (isspace(*read)) read++;
            if (*read == '\0') break;

            PieceType pt = PAWN;
            std::optional<File> disambigFile;
            std::optional<Rank> disambigRank;
            std::optional<Square> target;
            bool capture = false;
            PieceType promo = NO_PIECE_TYPE;
            bool isCastling = false;
            bool isKingside = false;

            // Castling: O-O or O-O-O :owo:
            if (*read == 'O' || *read == '0') {
                char castleChar = *read;
                if (read[0] == castleChar && read[1] == '-' && read[2] == castleChar) {
                    isCastling = true;
                    read += 3;
                    if (read[0] == '-' && read[1] == castleChar) {
                        read += 2; // O-O-O
                        isKingside = false;
                    } else {
                        isKingside = true;
                    }
                } else {
                    err = "Bad castling at " + std::to_string(read - moves.data());
                    return true;
                }
            }
            // Piece letter
            else if (*read == 'N' || *read == 'B' || *read == 'R' || *read == 'Q' || *read == 'K') {
                pt = promoMap[(*read | 0x20) - 'a'];
                read++;
            }

            if (!isCastling) {
                // [file][rank][x]<square>[=promo]
                // or just: <square>[=promo] (no disambiguation)
                // or LAN: <square><square>[promo] :sob:

                // Try reading a square
                const char* save = read;
                auto sq = eat_square();

                if (sq) {
                    // Target square, or first square of LAN, or disambig+more
                    if (*read == 'x' || peek_file()) {
                        // This was disambig or LAN from-square
                        disambigFile = file_of(*sq);
                        disambigRank = rank_of(*sq);

                        if (*read == 'x') { capture = true; read++; }

                        target = eat_square();
                        if (!target) {
                            err = "Bad target square at " + std::to_string(read - moves.data());
                            return true;
                        }
                    } else {
                        // The square we read IS the target (e4, Nf3)
                        target = sq;
                    }
                } else {
                    // maybe just a file disambig (Rae1) or 'x' capture
                    auto f = eat_file();
                    if (f) {
                        disambigFile = f;
                        if (*read == 'x') { capture = true; read++; }
                        target = eat_square();
                    } else if (*read == 'x') {
                        capture = true; read++;
                        target = eat_square();
                    } else {
                        err = "Cannot parse move at " + std::to_string(read - moves.data());
                        return true;
                    }

                    if (!target) {
                        err = "Bad target square at " + std::to_string(read - moves.data());
                        return true;
                    }
                }

                // Promotion: =Q or just q
                if (*read == '=') read++;
                if (*read >= 'a' && *read <= 'z') {
                    PieceType p = promoMap[*read - 'a'];
                    if (p != NO_PIECE_TYPE) { promo = p; read++; }
                } else if (*read >= 'A' && *read <= 'Z') {
                    PieceType p = promoMap[(*read | 0x20) - 'a'];
                    if (p != NO_PIECE_TYPE) { promo = p; read++; }
                }
            }

            // Skip check/checkmate symbolsssss
            while (*read == '+' || *read == '#' || *read == '!' || *read == '?') read++;

            // Now find the legal move
            Move selected = Move::none();
            auto legal = MoveList<LEGAL>(pos);
            Color us = pos.side_to_move();

            if (isCastling) {
                Square ksq = pos.square<KING>(us);
                for (const auto& m : legal) {
                    if (m.type_of() == CASTLING && m.from_sq() == ksq
                        && (isKingside == (m.to_sq() > ksq))) {
                        selected = m;
                        break;
                    }
                }
            } else if (pt == PAWN && disambigFile && disambigRank) {
                // LAN: we have from-square and to-square
                Square from = make_square(*disambigFile, *disambigRank);
                for (const auto& m : legal) {
                    if (m.from_sq() == from && m.to_sq() == *target
                        && (promo == NO_PIECE_TYPE || m.promotion_type() == promo)) {
                        selected = m;
                        break;
                    }
                    // LAN castling: king moves 2+ squares
                    if (type_of(pos.piece_on(from)) == KING && m.type_of() == CASTLING
                        && m.from_sq() == from
                        && (*target > from) == (m.to_sq() > from)) {
                        selected = m;
                        break;
                    }
                }
            } else {
                // SAN: use attackers_to to find candidates
                Bitboard candidates = pos.attackers_to(*target) & pos.pieces(us, pt);

                if (disambigFile)
                    candidates &= file_bb(*disambigFile);
                if (disambigRank)
                    candidates &= rank_bb(*disambigRank);

                for (const auto& m : legal) {
                    if (m.to_sq() == *target && (candidates & square_bb(m.from_sq()))
                        && type_of(pos.piece_on(m.from_sq())) == pt
                        && (promo == NO_PIECE_TYPE || m.promotion_type() == promo)) {
                        selected = m;
                        break;
                    }
                }

                // e.p., pawn captures to target but target is empty :woozy_face:
                if (selected == Move::none() && pt == PAWN) {
                    for (const auto& m : legal) {
                        if (m.type_of() == EN_PASSANT && m.to_sq() == *target
                            && (!disambigFile || file_of(m.from_sq()) == *disambigFile)) {
                            selected = m;
                            break;
                        }
                    }
                }
            }

            if (selected == Move::none()) {
                err = "Illegal move at " + std::to_string(read - moves.data());
                return true;
            }

            if (sanMovesEnd != sanMoves)
                *sanMovesEnd++ = ' ';

            Square from = selected.from_sq(), to = selected.to_sq();
            PieceType movedPt = type_of(pos.piece_on(from));

            if (emitLAN) {
                if (selected.type_of() == CASTLING) {
                    // Emit as king's actual movement (e.g. e1g1) rather than SF slop
                    // should work ok for chess960 :prayge:
                    bool ks = to > from;
                    Square lanTo = make_square(ks ? FILE_G : FILE_C, rank_of(from));
                    *sanMovesEnd++ = 'a' + file_of(from);
                    *sanMovesEnd++ = '1' + rank_of(from);
                    *sanMovesEnd++ = 'a' + file_of(lanTo);
                    *sanMovesEnd++ = '1' + rank_of(lanTo);
                } else {
                    *sanMovesEnd++ = 'a' + file_of(from);
                    *sanMovesEnd++ = '1' + rank_of(from);
                    *sanMovesEnd++ = 'a' + file_of(to);
                    *sanMovesEnd++ = '1' + rank_of(to);
                    if (selected.type_of() == PROMOTION)
                        *sanMovesEnd++ = char('a' + (selected.promotion_type() - KNIGHT) + ('n' - 'a'));
                }
            } else {
                // SAN
                if (selected.type_of() == CASTLING) {
                    bool ks = to > from;
                    if (ks) { *sanMovesEnd++ = 'O'; *sanMovesEnd++ = '-'; *sanMovesEnd++ = 'O'; }
                    else    { *sanMovesEnd++ = 'O'; *sanMovesEnd++ = '-'; *sanMovesEnd++ = 'O'; *sanMovesEnd++ = '-'; *sanMovesEnd++ = 'O'; }
                } else {
                    bool cap = pos.capture(selected);

                    if (movedPt != PAWN) {
                        *sanMovesEnd++ = pieceChar[movedPt];

                        // Disambiguation
                        Bitboard others = 0;
                        for (const auto& m : legal) {
                            if (m != selected && type_of(pos.piece_on(m.from_sq())) == movedPt
                                && m.to_sq() == to)
                                others |= square_bb(m.from_sq());
                        }
                        if (others) {
                            if (!(others & file_bb(from)))
                                *sanMovesEnd++ = 'a' + file_of(from);
                            else if (!(others & rank_bb(from)))
                                *sanMovesEnd++ = '1' + rank_of(from);
                            else {
                                *sanMovesEnd++ = 'a' + file_of(from);
                                *sanMovesEnd++ = '1' + rank_of(from);
                            }
                        }
                    } else if (cap) {
                        *sanMovesEnd++ = 'a' + file_of(from);
                    }

                    if (cap)
                        *sanMovesEnd++ = 'x';

                    *sanMovesEnd++ = 'a' + file_of(to);
                    *sanMovesEnd++ = '1' + rank_of(to);

                    if (selected.type_of() == PROMOTION) {
                        *sanMovesEnd++ = '=';
                        *sanMovesEnd++ = pieceChar[selected.promotion_type()];
                    }
                }

            }

            states->emplace_back();
            pos.do_move(selected, states->back());

            // Check/checkmate suffix (SAN only)
            if (!emitLAN && pos.checkers()) {
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
        // todo
        return "";
    }

    std::string moveAt(int index) const {
        // todo
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
