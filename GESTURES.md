# Gesture Map

The system recognises three primary hand poses. Everything you do is driven
by these, plus the on-screen toolbar and a few keyboard shortcuts.

## Hand gestures

| Gesture | Visual | Mode | Action |
|---|---|---|---|
| **Open palm** | ✋ all fingers spread | Hover / UI | Cursor (index fingertip) moves; toolbar buttons highlight as you hover over them |
| **Pinch** | 🤏 thumb + index tip touching | Draw | Move while pinching to draw a stroke with the current colour & brush size |
| **Pinch (short)** | quick pinch + release over the toolbar | Tap | Activates the hovered toolbar button (colour, brush, undo, ...) |
| **Fist** | ✊ all four fingers curled | Erase | Rubs out stroke points under the fingertip (hold to keep erasing) |

> A pinch that lasts fewer than `PINCH_TAP_MAX_FRAMES` frames and starts over
> a toolbar button is treated as a *tap*; anywhere else it just draws a short
> stroke.

## Toolbar buttons

| Button | Action |
|---|---|
| Colour swatches (8) | Pick the drawing colour |
| Brush dots (4 / 10 / 22) | Pick the stroke thickness |
| Undo / Redo | Step backwards / forwards through canvas history |
| Clear | Remove all strokes from the active layer |
| Export | Save the drawing as SVG, PNG, PDF and `.tex` |
| Recognize | Run OCR + shape/formula recognition on the current drawing |

## Keyboard shortcuts

| Key | Action |
|---|---|
| `Esc` / `q` | Quit |
| `z` / `y` | Undo / Redo |
| `c` | Clear the active layer |
| `r` | Recognize (same as toolbar button) |
| `e` | Export (same as toolbar button) |
| `l` | Add a new layer |
| `1` .. `4` | Switch the active layer |

## Layering

New strokes go on the active layer. Layers stack in the order they were
created; add layers with the `l` key and switch with `1`..`4`. Export always
produces the flattened canvas (all visible layers).

## Tuning the gestures

All thresholds live in `config.py`:

| Setting | Meaning | Default |
|---|---|---|
| `PINCH_RATIO` | pinch distance ÷ palm size below which a pinch is detected | `0.35` |
| `PINCH_TAP_MAX_FRAMES` | max pinch length (frames) counted as a tap | `6` |
| `MIN_DETECTION_CONFIDENCE` | MediaPipe hand-detection threshold | `0.7` |
| `CURSOR_SMOOTHING` | cursor smoothing factor (higher = more responsive) | `0.6` |

If a pose is misclassified, nudge the relevant value:
- pinch detected too easily (open hand triggers draw) → lower `PINCH_RATIO`
- pinch hard to trigger → raise `PINCH_RATIO`
- fist often read as pinch → lower `PINCH_RATIO` or raise `PINCH_TAP_MAX_FRAMES`
