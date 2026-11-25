# Kings of Cups (聖杯之王)

_Repo name: game-sliding-cups (the game was called Sliding Cups until 13.2.0)._

**Status:** active · **Updated:** 2026-11-22

A flick-and-merge web game for iPad (also iPhone and desktop). Flick cups across a table like curling; same creature + same chess tier merge into the next tier (pawn → king), two kings make a checkmate. Don't let cups pile up inside the line.

- Play: https://jellyfruit.github.io/game-sliding-cups/ (Add to Home Screen for offline play)
- Modes: Classic, Practice, Levels · Items · VP unlocks for 7 mythical creatures · English / 繁體中文

## Develop

No build step. Open `index.html`, or serve the folder for the service worker:

```sh
python3 -m http.server
npm test            # core, physics baseline, i18n, version
npm run test:e2e    # browser end-to-end (Playwright + Chrome)
node tools/release.js patch|minor|major -m "..."
```

## Docs

- `CLAUDE.md` — map of the repo and session rules (start here)
- `GAME_DESIGN.md` — current rules and screens
- `ARCHITECTURE.md` — current code structure
- `docs/DECISIONS.md` — decision log; `docs/CALIBRATION.md` — level bot numbers
- `STORY.md` — campaign story
- `ART_STYLE.md`, `ASSET_SPEC.md` — art direction and sprite spec
- `CHANGELOG.md` — releases
