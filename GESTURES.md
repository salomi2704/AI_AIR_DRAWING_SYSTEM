# Gesture Map

Drawing is a *single-hand* activity and erasing is a *two-hand* activity, so
a stray second hand can never scribble on your canvas by accident.

## Hand gestures

| Gesture | Visual | Mode | Action |
|---|---|---|---|
| **Open palm (one hand)** | all fingers spread | Hover / UI | Cursor (index fingertip) moves; toolbar buttons highlight as you hover over them |
| **Pinch (one hand)** | thumb + index tip touching | Draw | Move while pinching to draw a stroke with the current colour & brush size |
| **Pinch, short (one hand, over a button)** | quick pinch + release over the toolbar | Tap | Activates the hovered toolbar button (colour, brush, undo, ...) |
| **Two fists (both hands)** | both hands curled | Erase | Rubs out stroke points under the second hand's fingertip (hold to keep erasing) |

> A pinch that starts over a toolbar button is a *tap* — it never draws, and
> it registers whenever you release it. Pinches anywhere else just draw a
> stroke.
>
> A single fist no longer erases — erasing deliberately requires **two hands
> closed at the same time** (the hand configured by `ERASE_HAND_INDEX` drives
> the eraser). A second hand that is not a fist only hovers the UI and never
> draws.

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
| `PINCH_RATIO` | pinch distance ÷ palm size below which a pinch starts | `0.35` |
| `PINCH_EXIT_RATIO` | pinch releases only above this (prevents hover/draw flicker) | `0.49` |
| `ERASE_INTERVAL` | seconds between consecutive erase passes while holding two fists | `0.10` |
| `ERASE_HAND_INDEX` | which hand (0 = first, 1 = second) drives the eraser | `1` |
| `MIN_DETECTION_CONFIDENCE` | MediaPipe hand-detection threshold | `0.7` |
| `CURSOR_SMOOTHING` | cursor smoothing while the hand is still (higher = more responsive) | `0.6` |
| `CURSOR_SPEED_GAIN` | extra cursor responsiveness while the hand moves fast | `8.0` |

If a pose is misclassified, nudge the relevant value:
- pinch detected too easily (open hand triggers draw) → lower `PINCH_RATIO`
- pinch hard to trigger → raise `PINCH_RATIO`
- hand flickers between hover and draw → widen the gap between `PINCH_RATIO`
  and `PINCH_EXIT_RATIO`
- two-fist erase feels wrong-handed → swap `ERASE_HAND_INDEX` between `0` and `1`
