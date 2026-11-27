# Demo video and deck

Built the way [/brag](https://github.com/latent-spaces/brag) builds launch videos, stretched to a three-minute demo and
structured after a reference launch video (a dark human opening, a diagram of where the data goes, the real product with a
visible cursor, a refusal on camera, a plain "proven, and not yet" slide): the
real app and real command output on screen, every frame a function of its time, cuts on the music's beat. The words are
in [script.md](script.md); change them there and rebuild.

## Rebuild

```bash
npm run build
WINNOW_PREVIEW=1 COOKIE_SECRET=any-long-local-secret npx next start -p 3117 &   # the app the video films
APP_URL=http://localhost:3117 bash video/evidence.sh > video/work/evidence.txt           # real refusals for the trust scene
NODE_USE_ENV_PROXY=1 node video/vo.mjs                                            # voiceover (ElevenLabs; cached by content)
NODE_PATH=$(npm root -g) node video/render.cjs --stills 4,24,37.5                 # check stills first
NODE_PATH=$(npm root -g) node video/render.cjs                                    # every frame
node video/assemble.mjs                                                           # brag-output/brag.mp4
NODE_PATH=$(npm root -g) node presentation/deck.cjs                               # presentation/winnow-deck.pdf
```

`vo.mjs` needs `ELEVENLABS_API_KEY`. `NODE_USE_ENV_PROXY=1` is only needed behind a proxy. `assemble.mjs` reads the music
from a local copy of brag's bundled tracks; set `MUSIC` to use another file.

## The voices

- **US**: Sarah, an ElevenLabs premade American English voice, on `eleven_multilingual_v2`.
- **IN**: Indian English. ElevenLabs' free plan blocks library voices and designed voices through the API, so this line
  asks `eleven_v3` for the accent with an audio tag (`[strong Indian accent]`) on a premade voice. Change it with
  `VOICE_IN` and `IN_TAG`. On a paid plan, a library Indian English voice is the better choice.

Every clip is transcribed back with ElevenLabs speech-to-text to check the words, since the accent tag must not be
spoken. Clips are stored by the hash of their text, voice and model, so changing one line re-bills only that line.

## When results exist

1. `npm run results -- ...` writes `data/results.json`.
2. `node video/vo.mjs --results "After N visitors, X is at Y percent to win."` adds the RESULTS line.
3. Re-render. The race page and deck slide 8 then show the real numbers.

Re-record scene 3 against the deployed app too, so the roast is a real one instead of a `[preview]` one.

## What the current cut is out of date on

The video was rendered on 26 Nov, before several later changes. It still says "ninety percent win probability" where the rule is now
a 90% chance of beating control, it says thirteen tests where there are now 22, it shows the old home page, and it doesn't mention
the AI judge. `video/script.md` records the words as recorded. Re-voice scenes 8 and 10, re-film the app scenes against the deployed
app, and render again once there are real results.

## Credits

Music: "Happy Beats / Business Moves Vol. 1" by Sascha Ende, ende.app, CC BY 4.0. Voices: ElevenLabs.
