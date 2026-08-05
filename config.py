"""Central configuration for the AI Air Drawing System.

Every tunable parameter used across the modules (tracking, canvas, UI,
recognition, ai_assist and export) lives here so the application can be
tuned without touching the rest of the code.
"""

from __future__ import annotations

from pathlib import Path

PROJECT_ROOT: Path = Path(__file__).resolve().parent

# ---------------------------------------------------------------------------
# Camera / capture
# ---------------------------------------------------------------------------
CAMERA_INDEX: int = 0
CAMERA_WIDTH: int = 1280
CAMERA_HEIGHT: int = 720
FPS_TARGET: int = 30
TRACKING_SCALE: float = 0.5  # factor applied to frames fed to MediaPipe

# ---------------------------------------------------------------------------
# Virtual canvas
# ---------------------------------------------------------------------------
CANVAS_WIDTH: int = 1920
CANVAS_HEIGHT: int = 1080
DEFAULT_BRUSH_SIZE: int = 10
ERASE_RADIUS: float = 0.035  # normalized to canvas diagonal
MAX_LAYERS: int = 8
HISTORY_LIMIT: int = 50  # max undo steps kept
MIN_STROKE_DISTANCE: float = 1.5  # px, min gap between stroke points

# ---------------------------------------------------------------------------
# Hand landmark tracking (MediaPipe Tasks API)
# ---------------------------------------------------------------------------
MODELS_DIR: Path = PROJECT_ROOT / "models"
HAND_LANDMARKER_MODEL_PATH: Path = MODELS_DIR / "hand_landmarker.task"
HAND_LANDMARKER_MODEL_URL: str = (
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/"
    "hand_landmarker/float16/latest/hand_landmarker.task"
)
NUM_HANDS: int = 2
MIN_DETECTION_CONFIDENCE: float = 0.7
MIN_TRACKING_CONFIDENCE: float = 0.5
MIN_PRESENCE_CONFIDENCE: float = 0.5

# ---------------------------------------------------------------------------
# Gesture classification
# ---------------------------------------------------------------------------
PINCH_RATIO: float = 0.35  # pinch_distance / palm_size below this => pinch
PINCH_EXIT_RATIO: float = 0.49  # hysteresis: pinch drops out only above this
ERASE_INTERVAL: float = 0.10  # seconds between consecutive erase passes
ERASE_HAND_INDEX: int = 1  # which hand (0=first, 1=second) drives the eraser
CURSOR_SMOOTHING: float = 0.6  # EMA alpha for cursor movement
CURSOR_SPEED_GAIN: float = 8.0  # extra responsiveness while the hand moves

# Temporal landmark smoothing (One-Euro filter, applied before classification).
LANDMARK_SMOOTHING_ENABLED: bool = True
SMOOTHING_MIN_CUTOFF: float = 2.0  # Hz, jitter below this is suppressed
SMOOTHING_BETA: float = 0.05  # Hz per normalized-unit/s of landmark speed
SMOOTHING_D_CUTOFF: float = 1.0  # Hz, cutoff for the derivative filter

# Pinch robustness.
PINCH_CONFIDENCE_ADAPTATION: float = 0.3  # 0=ignore score, 1=threshold driven by it
PINCH_CONFIRM_FRAMES: int = 2  # frames a pinch must persist before drawing starts

# ---------------------------------------------------------------------------
# UI / toolbar
# ---------------------------------------------------------------------------
TOOLBAR_HEIGHT: int = 96
# Palette entries: (display name, hex colour)
COLOR_PALETTE: list[tuple[str, str]] = [
    ("black", "#000000"),
    ("red", "#E53935"),
    ("orange", "#FB8C00"),
    ("yellow", "#FDD835"),
    ("green", "#43A047"),
    ("blue", "#1E88E5"),
    ("purple", "#8E24AA"),
    ("white", "#FFFFFF"),
]
BRUSH_SIZES: list[int] = [4, 10, 22]
DEFAULT_COLOR: str = "#000000"
DEFAULT_INDEX_COLOR: int = 0  # "black"
DEFAULT_INDEX_BRUSH: int = 1  # "10"

# ---------------------------------------------------------------------------
# Recognition (OCR / shapes / formulas)
# ---------------------------------------------------------------------------
OCR_LANGUAGE: str = "eng"
TESSERACT_CMD: str = "tesseract"
OCR_THRESHOLD: int = 160  # binarisation threshold for the OCR image
SHAPE_MIN_POINTS: int = 12  # strokes with fewer points are treated as lines

# ---------------------------------------------------------------------------
# AI assist
# ---------------------------------------------------------------------------
CLEANUP_ENABLED: bool = True
CLEANUP_THRESHOLD: float = 0.08  # relative fit error allowed before snapping

# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------
EXPORT_DPI: int = 150
EXPORT_DIR: Path = PROJECT_ROOT / "exports"
EXPORT_BACKGROUND: str = "#FFFFFF"

# ---------------------------------------------------------------------------
# Storage / autosave
# ---------------------------------------------------------------------------
AUTOSAVE_ENABLED: bool = True
AUTOSAVE_INTERVAL: float = 10.0  # seconds between automatic saves
AUTOSAVE_DIR: Path = PROJECT_ROOT / "sessions"
AUTOSAVE_PATH: Path = AUTOSAVE_DIR / "airdraw_autosave.json"

# Convenience: make sure derived directories exist.
MODELS_DIR.mkdir(parents=True, exist_ok=True)
EXPORT_DIR.mkdir(parents=True, exist_ok=True)
AUTOSAVE_DIR.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# Colour helpers (config stores hex; OpenCV wants BGR, SVG wants RGB)
# ---------------------------------------------------------------------------
def hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    """Convert a ``#RRGGBB`` string to an ``(r, g, b)`` tuple."""
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4))


def hex_to_bgr(hex_color: str) -> tuple[int, int, int]:
    """Convert a ``#RRGGBB`` string to an OpenCV ``(b, g, r)`` tuple."""
    r, g, b = hex_to_rgb(hex_color)
    return b, g, r
