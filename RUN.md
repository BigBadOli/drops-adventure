# How to run the game

Two steps. The first one has to keep running the whole time you play.

## 1. Start the server

```bash
cd /Users/oli/drops-adventure && npm run dev
```

**Leave that terminal tab open.** It *is* the server — closing the tab, quitting
Terminal or restarting the Mac all stop the game being reachable. From GitHub
Desktop: **Repository → Open in Terminal** (Cmd+`) opens a terminal already in
the right folder.

## 2. Open it

```bash
open "http://localhost:8787/"
```

Always port **8787**. If a link doesn't load, step 1 isn't running.

If you hear music but see nothing, an old tab is still playing — the game keeps
running in a tab even after the server stops. Close every Drops Adventure tab
and open one fresh.

## Jump straight to a planet

| | |
|---|---|
| Gummy Isle | `open "http://localhost:8787/?t=30"` |
| Hazy Acres | `open "http://localhost:8787/?planet=1&t=30"` |
| Ring Reach | `open "http://localhost:8787/?planet=2&t=30"` |

## Bits you can add to any URL

- `?t=30` — start at midday · `?t=88` — start at night
- `?dev` — fps and draw-call readout in the corner
- `?seed=123` — fixed gummy layout, for comparing runs
- Combine with `&`, e.g. `?planet=2&t=88&dev`

## In-game

- **1 / 2 / 3 / 4** pick a hero · **WASD** move · **mouse** look
- **Space** hop, tap twice to double jump · **Shift** sprint
- **E** at the red-leafed plant to call a ship
- **C** switch hero · **M** mute · **R** restart
