# Demo video and deck

The demo is built from code: the real app and real command output are filmed in a headless browser, every frame is a function of its
time, and cuts land on the music's beat. The words are in [script.md](script.md), which is the only copy. Change them there and rebuild.

## Rebuild

```bash
npm run build
WINNOW_PREVIEW=1 COOKIE_SECRET=any-long-local-secret npx next start -p 3117 &
APP_URL=http://localhost:3117 bash video/evidence.sh > video/work/evidence.txt
NODE_USE_ENV_PROXY=1 node video/vo.mjs
NODE_PATH=$(npm root -g) node video/render.cjs --stills 4,24,37.5
NODE_PATH=$(npm root -g) node video/render.cjs
node video/assemble.mjs
NODE_PATH=$(npm root -g) node presentation/deck.cjs
```

In order: the app the video films; the refusals for the trust scene (real responses, captured by `evidence.sh`); the voiceover;
three stills to check before spending the time on every frame; every frame; the encode; the deck.

| Output | Where |
|---|---|
| Video, poster and a ready-to-paste caption | `video-output/winnow-demo.mp4`, `winnow-demo.jpg`, `share-copy.txt` (not committed) |
| Deck | `presentation/winnow-deck.pdf` |

`vo.mjs` needs `ELEVENLABS_API_KEY`. `NODE_USE_ENV_PROXY=1` is only needed behind a proxy. The music is bundled in
`video/assets/music/`; set `MUSIC` to use another file.

## What is on screen is real

- The app scenes are the running app in preview mode, so the roasts are labelled `[preview]`.
- The terminal scenes replay real output. `evidence.sh` runs the forged-vote requests against the running app. `evidence-setup.txt`
  is the output of `npm run setup:flagsmith` from the first successful live run (experiment id 1048).
- Nothing in a frame is typed by hand into a mock-up.

## The voices

- **US**: Sarah, an ElevenLabs premade American English voice, on `eleven_multilingual_v2`.
- **IN**: Indian English. ElevenLabs' free plan blocks library voices and designed voices through the API, so this line asks
  `eleven_v3` for the accent with an audio tag (`[strong Indian accent]`) on a premade voice. Change it with `VOICE_IN` and `IN_TAG`.
  On a paid plan, a library Indian English voice is the better choice.

Every clip is transcribed back with ElevenLabs speech-to-text to check the words, since the accent tag must not be spoken. Clips are
stored by the hash of their text, voice and model, so changing one line re-bills only that line.

## Showing real results

Once `npm run finalize` has written `data/results.json`, add a results line and render again:

```bash
node video/vo.mjs --results "After N visitors, X is at Y percent to beat control."
```

The race page and the deck's results slide then show the real numbers. Re-film the app scenes against a deployment with preview
mode off if you want the roast on screen to be a real one. Any simulated number must stay under its purple **SIMULATED** tag.

## Credits

Music: "Happy Beats / Business Moves Vol. 1" by Sascha Ende, ende.app, CC BY 4.0 (see
[assets/music/README.md](assets/music/README.md)). Voices: ElevenLabs.
