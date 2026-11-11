"""Build the curated puzzle set from the Lichess puzzle database (CC0).

Source: https://database.lichess.org/#puzzles  (lichess_db_puzzle.csv.zst)
Selection is deterministic so auditors can reproduce it:
  * quality filter: Popularity >= 80, NbPlays >= 200, RatingDeviation <= 90
  * stratified by 100-point rating bucket (300..3300)
  * per (theme, bucket) cap so every Lichess theme is represented at every level
  * per bucket total cap
Usage: python -I scripts/build-puzzles.py <path-to-zst> data/puzzles.csv.gz
"""
import csv, gzip, io, sys
from compression import zstd

META = {"oneMove", "short", "long", "veryLong", "middlegame", "opening", "endgame",
        "advantage", "crushing", "equality", "master", "masterVsMaster", "superGM", "mate"}
THEME_CAP, BUCKET_CAP = 45, 2600

def main(src, dst):
    per_tb, per_b = {}, {}
    kept = 0
    with zstd.open(src, "rt", encoding="utf-8", newline="") as f, gzip.open(dst, "wt", encoding="utf-8", newline="") as out:
        r = csv.reader(f)
        header = next(r)
        idx = {h: i for i, h in enumerate(header)}
        w = csv.writer(out)
        w.writerow(["id", "fen", "moves", "rating", "rd", "popularity", "plays", "themes", "openings", "gameUrl"])
        for row in r:
            try:
                rating = int(row[idx["Rating"]]); rd = int(row[idx["RatingDeviation"]])
                pop = int(row[idx["Popularity"]]); plays = int(row[idx["NbPlays"]])
            except (ValueError, IndexError):
                continue
            if pop < 80 or plays < 200 or rd > 90:
                continue
            b = max(3, min(33, rating // 100))
            if per_b.get(b, 0) >= BUCKET_CAP:
                continue
            themes = row[idx["Themes"]].split()
            tactical = [t for t in themes if t not in META] or themes
            if not any(per_tb.get((t, b), 0) < THEME_CAP for t in tactical):
                continue
            for t in tactical:
                per_tb[(t, b)] = per_tb.get((t, b), 0) + 1
            per_b[b] = per_b.get(b, 0) + 1
            kept += 1
            w.writerow([row[idx["PuzzleId"]], row[idx["FEN"]], row[idx["Moves"]], rating, rd, pop, plays,
                        row[idx["Themes"]], row[idx.get("OpeningTags", -1)] if "OpeningTags" in idx else "", row[idx["GameUrl"]]])
    print("kept", kept, "buckets", dict(sorted(per_b.items())))

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
