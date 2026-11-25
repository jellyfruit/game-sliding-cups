# Kings of Cups (聖杯之王)

_Repo name: game-sliding-cups (the game was called Sliding Cups until 13.2.0)._

**Status:** active · **Updated:** 2026-11-25

A flick-and-merge web game for iPad (also iPhone and desktop). Flick chess pieces across a table like curling; same creature + same tier merge into the next tier (pawn → king), two kings make a checkmate. Don't let pieces rest inside the line.

- Play: https://jellyfruit.github.io/game-sliding-cups/ (Add to Home Screen for offline play)
- Modes: **Story** (five chapters, from the tutorial to the Chimera boss and the ending), **Classic** (endless high score with rune pillars), **Proving Grounds** (practice)
- 8 mythical creatures to tame (7 with VP, the Chimera by beating the finale) · creature ultimates · field items · Armory equipment · English / 繁體中文

## Develop

No build step: `index.html` loads plain scripts from `src/` (core in `src/core` + `src/data`, app in `src/app`). Serve the folder (needed for the service worker and full error messages; opening `index.html` directly also plays):

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
