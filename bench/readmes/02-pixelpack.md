# pixelpack

Pack many small PNGs into one sprite sheet, and get a JSON map of where each one went.

## Install

    npm install -g pixelpack

## Usage

    pixelpack ./icons --out sheet.png --map sheet.json

Flags: `--padding <px>` (default 2), `--max-size <px>` (default 2048), `--trim` to cut transparent edges.

## Output

`sheet.json` has one entry per input file: `{ "name": "save.png", "x": 0, "y": 34, "w": 32, "h": 32 }`.

## Limits

Only PNG input. Sheets larger than `--max-size` are split into `sheet-1.png`, `sheet-2.png`.
