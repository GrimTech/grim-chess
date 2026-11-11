# Master-game corpus ("Guess the move")

Complete game scores (moves only) of instructive classical games from 1851 to 2024, used by the *Guess the move*
trainer (`/train/guess-the-move`, served by `GET /api/curriculum/games`) and referenced by the stage 5-8 lessons
in `content/lessons/adult/`.

| File | Years | Games | Curated | Deterministic fill | 1-0 / 0-1 / ½ | Main players |
|---|---|---|---|---|---|---|
| `classics-romantic.pgn` | 1851-1885 | 23 | 15 | 8 | 16/7/0 | Anderssen, Morphy, early Steinitz |
| `classics-steinitz-lasker.pgn` | 1886-1913 | 56 | 37 | 19 | 33/23/0 | Steinitz, Chigorin, Tarrasch, Pillsbury, Lasker, Rubinstein, young Capablanca |
| `classics-interwar.pgn` | 1914-1945 | 60 | 33 | 27 | 44/16/0 | Capablanca, Alekhine, Nimzowitsch, Reti, Euwe, young Botvinnik |
| `classics-soviet.pgn` | 1946-1971 | 85 | 52 | 33 | 60/23/2 | Botvinnik, Smyslov, Bronstein, Tal, Petrosian, Spassky, Fischer, Keres, Geller, Stein, Larsen |
| `classics-karpov-kasparov.pgn` | 1972-1999 | 68 | 48 | 20 | 52/16/0 | Karpov, Kasparov, Korchnoi, Anand, Kramnik, Ivanchuk, Shirov, Topalov |
| `classics-modern.pgn` | 2000-2024 | 77 | 31 | 46 | 55/19/3 | Kramnik, Anand, Topalov, Carlsen, Caruana, Aronian, Ding, Nepomniachtchi, Nakamura, Giri, So |
| **Total** | | **369** | 216 | 153 | | 257 KB, 33677 plies |

Theme tags used during selection (not stored in the PGN): attack 141, endgame 64, positional 100, middlegame 63, defence 1.

## Format

- Standard PGN, one file per era, games sorted by date. Tags: `Event, Site, Date, Round, White, Black, Result` and `ECO`
  when the source has it (seven-tag roster plus ECO). Player names and event names are kept as spelled in the source.
- Moves only: every comment, variation, NAG and annotation symbol was stripped; the move text was regenerated from
  chess.js so that SAN is canonical (e.g. `Nbd2`, `O-O`, `e8=Q+`), with move numbers and the result token.
- Every game was replayed move by move with **chess.js 1.4** (all moves legal from the initial position) and has a
  Result header of `1-0`, `0-1` or `1/2-1/2` matching the result token. The written files were parsed a second
  time with `Chess.loadPgn` before being copied here (0 failures).

## Source

All scores come from the free player files of **PGN Mentor** (https://www.pgnmentor.com/files.html, section
"Players"), downloaded on 2026-11-11 as `https://www.pgnmentor.com/players/<Name>.zip` for these 40 players:
Alekhine, Anand, Anderssen, Aronian, Botvinnik, Bronstein, Capablanca, Carlsen, Caruana, Chigorin, Ding, Euwe, Fischer, Geller, Giri, Ivanchuk, Karpov, Kasparov, Keres, Korchnoi, Kramnik, Larsen, Lasker, Marshall, Morphy, Nakamura, Nepomniachtchi, Nimzowitsch, Petrosian, Pillsbury, Reti, Rubinstein, Shirov, Smyslov, Spassky, Stein, Steinitz, Tal, Tarrasch, Topalov.
(The 41 files contain about 99,000 games after de-duplication; only data was read from them.) Game scores are
facts and are not subject to copyright; PGN Mentor provides the files for free download.

## Selection criteria

Selection is fully deterministic (re-running the selection script on the same files gives the same corpus).

1. **Curated list (216 games).** A hand-written list of 136 famous, widely annotated games and
   matches (Immortal and Evergreen games, Opera game, Steinitz-von Bardeleben, Lasker-Bauer, Rotlewi-Rubinstein,
   the Immortal Zugzwang game, Reti-Alekhine 1925, Botvinnik-Capablanca AVRO 1938, Byrne-Fischer 1956,
   Petrosian-Spassky 1966 game 10, Fischer-Spassky 1972, Karpov-Kasparov 1984-90, Kasparov-Topalov 1999,
   Topalov-Shirov 1998, Carlsen-Anand 2013 and others), each given as (White, Black, year, result). For each entry,
   every distinct matching classical game was taken (at most 3 per entry, longest score first when sources
   disagree), so match entries contribute several games. 117 of the 136 entries were found; not found in the
   downloaded files (the other player was not one of the 41 file owners, or the name/year differs):
   Zukertort-Blackburne 1883, Bernstein-Capablanca 1914, Capablanca-Janowski 1913, Capablanca-Nimzowitsch 1927, Tarrasch-Mieses 1916, Averbakh-Kotov 1953, Tal-Koblents 1957, Polugaevsky-Nezhmetdinov 1958, Karpov-Korchnoi 1974, Karpov-Gligoric 1974, Karpov-Korchnoi 1978, Kasparov-Ivanchuk 1995, Ivanchuk-Yusupov 1991, Shirov-Anand 1993, Nepomniachtchi-Ding 2023, Aronian-Carlsen 2008, Ivanchuk-Shirov 1996, So-Carlsen 2017, Giri-Carlsen 2019.
2. **Deterministic fill (153 games).** For each of the 41 players: wins (as White or Black) against an opponent on a
   fixed list of notable masters, in events whose name does not indicate rapid, blitz, online, simultaneous,
   blindfold, odds, Chess960, exhibition or tie-break play. Wins were sorted by date and sampled at evenly spaced
   positions: 3 games of 25-59 moves (attack / middlegame) and 1 game of 60-110 moves (technique / endgame).
3. **De-duplication** across player files by players and the first 20 moves.

Known limitations: the fill is a sample, not a "best games" list; some modern events in PGN Mentor files carry
generic names, so a few non-classical games may remain despite the event-name filter; dates are often
`YYYY.??.??` for older games.

## Use in lessons

Stage 5-8 lessons (`content/lessons/adult/s5-*.json` ... `s8-*.json`) cite positions from these games by players,
event and year; the positions were generated by replaying the scores in this corpus and checked with Stockfish 19.
