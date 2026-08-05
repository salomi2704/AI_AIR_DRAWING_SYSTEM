# AI Air Drawing System

A real-time, gesture-based air drawing application built with computer
vision. Draw in the air with your fingertip — pinch to draw with one hand,
close both fists to erase, and use an open palm to drive an on-screen
toolbar. The finished drawing can be run through OCR, shape/formula
recognition and exported to SVG, PNG, PDF and LaTeX.

```
   ✋ hover/UI      🤏 pinch = draw (one hand)      ✊✊ two fists = erase
```

## Features

- **Hand tracking** — MediaPipe Tasks API (`hand_landmarker`) landmark
  detection with automatic model download
- **Gesture classification** — pinch / fist / open palm from landmark
  geometry (rotation-invariant, palm-size normalised)
- **Virtual canvas** — multi-layer stroke recording, point-based erasing,
  undo/redo, colour and brush selection
- **Gesture-controlled toolbar** — colour palette, brush sizes, undo, redo,
  clear, export and recognize, all driven by the hand
- **Recognition** — Tesseract OCR for handwritten text, contour-based shape
  detection (lines, circles, boxes, arrows), flowchart assembly and
  heuristic formula detection
- **AI assist** — snaps rough strokes to clean geometry and converts
  formulas to LaTeX (optional pix2tex backend)
- **Export** — vector SVG, raster PNG, PDF (reportlab) and a compilable
  `.tex` report
- **30 fps target** — tuned for real-time webcam use

## Requirements

- Python 3.10+ (tested on 3.12)
- A webcam
- The **Tesseract OCR binary** for text recognition
  (optional — the app runs without it, OCR is simply skipped)

## Setup

```bash
# 1. Create a virtual environment
python -m venv .venv
.venv\Scripts\activate          # Windows
source .venv/bin/activate       # macOS / Linux

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Install the Tesseract binary (for OCR)
#    Windows: https://github.com/UB-Mannheim/tesseract/wiki
#    macOS:   brew install tesseract
#    Linux:   sudo apt install tesseract-ocr
#    (set config.TESSERACT_CMD if the binary is not on your PATH)
```

The MediaPipe hand-landmarker model (~8 MB) downloads automatically on first
run into `models/`.

## Usage

```bash
python app.py
```

| Option | Description |
|---|---|
| `--camera SRC` | camera index (default `0`) or path to a video file |
| `--width W --height H` | requested camera resolution (default `1280x720`) |
| `--no-recognize` | skip OCR/shape recognition for faster startup |

The app logs the camera's actual resolution at startup and builds the toolbar
to fit it, so it works with any webcam resolution. A `HAND / NO HAND` badge
next to the toolbar shows whether tracking currently sees you.

Once running, use the gestures below. Full gesture legend and keyboard
shortcuts are in **[GESTURES.md](GESTURES.md)**.

| Gesture | Action |
|---|---|
| Open palm (one hand) | Hover / UI mode — cursor follows your index fingertip |
| Pinch (one hand) | Draw a stroke (hold + move) |
| Pinch over a button (one hand) | Tap — activates the toolbar button |
| Two fists (both hands) | Erase under the second hand's fingertip |

Drawing is single-hand only and erasing requires **both** hands closed, so a
second hand never draws by accident.

**Recognition**: press `r` (or the *Recognize* button) to OCR the drawing,
detect shapes/diagrams and extract formulas. Press `e` (or *Export*) to write
`airdraw_<timestamp>.svg/.png/.pdf/.tex` into `exports/`.

## Architecture

```
app.py                     entry point: camera loop, gesture dispatch,
                           recognition triggers and export wiring
config.py                  every tunable parameter in one place
tracking/                  MediaPipe hand tracking + gesture classification
canvas/                    virtual canvas: layers, strokes, undo/redo, render
ui/                        gesture-controlled toolbar + HUD renderer
recognition/               OCR (pytesseract), shape/diagram detection,
                           formula detection
ai_assist/                 sketch cleanup (snap to geometry), LaTeX converter
export/                    SVG / PNG / PDF / .tex exporters
tests/                     unit tests (no camera required)
```

Data flow:

```
camera frame ─► tracking.HandTracker ─► GestureClassifier
                                            │  pinch / fist / palm
                                            ▼
                     canvas.VirtualCanvas (strokes, layers, undo/redo)
                                            │
                     recognition (OCR + shapes + formulas) ─► ai_assist
                                            │                    │
                                            ▼                    ▼
                          export (SVG / PNG / PDF / TeX)   cleanup + LaTeX
```

Each module is independent and testable on its own — see *Testing*.

## Testing

```bash
python -m unittest discover -s tests
```

Tests use synthetic hand landmarks and synthetic strokes, so no camera or
webcam is required. OCR tests skip automatically when Tesseract is missing.

## Configuration

All tunable parameters live in `config.py`: detection confidence, canvas and
camera resolution, pinch/erase thresholds, colour palette, brush sizes,
export DPI and more. See the comments in that file and the tuning table in
GESTURES.md.
