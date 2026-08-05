"""AI Air Drawing System - main application entry point.

Wires the whole pipeline together::

    tracking -> canvas -> UI -> recognition -> ai_assist -> export

Run with::

    python app.py            # webcam mode (gesture controlled)
    python app.py --help     # options

Gestures: pinch = draw / tap toolbar, fist = erase, open palm = hover UI.
See GESTURES.md for the full mapping and README.md for setup.
"""

from __future__ import annotations

import argparse
import math
import time
from typing import Optional

import cv2
import numpy as np

import config
from ai_assist import LatexConverter, SketchCleaner
from canvas import VirtualCanvas
from export import ExportBundle, ExportError, export_all
from recognition import FormulaDetector, OCRRecognizer, ShapeRecognizer
from tracking import Gesture, GestureClassifier, HandTracker
from ui import Toolbar, UIRenderer
from ui.toolbar import Button

WINDOW_NAME = "AI Air Drawing"
LOST_FRAMES_TOLERANCE = 3  # consecutive frames without a hand before reset
STATUS_DURATION = 2.5  # seconds the status banner stays visible


def build_parser() -> argparse.ArgumentParser:
    """Command-line options for the app."""
    parser = argparse.ArgumentParser(
        description="Gesture-based air drawing with recognition and export."
    )
    parser.add_argument(
        "--camera",
        type=str,
        default=str(config.CAMERA_INDEX),
        help="camera index (e.g. 0) or path to a video file",
    )
    parser.add_argument(
        "--width", type=int, default=config.CAMERA_WIDTH, help="camera frame width"
    )
    parser.add_argument(
        "--height", type=int, default=config.CAMERA_HEIGHT, help="camera frame height"
    )
    parser.add_argument(
        "--no-recognize",
        action="store_true",
        help="skip OCR/shape recognition (faster, no tesseract needed)",
    )
    return parser


def resolve_mode(
    states: list,
) -> tuple[str, object | None, object | None]:
    """Decide the interaction mode from the visible hand poses.

    Returns ``(mode, primary, eraser)`` where ``primary`` drives the cursor
    and ``eraser`` (erase mode only) drives the erase location.

    Modes:

    * ``"none"``   - no hand in view.
    * ``"erase"``  - two or more hands, every one a fist; the configured hand
      (``config.ERASE_HAND_INDEX``) is the eraser.
    * ``"single"`` - exactly one hand in view; it may draw / tap / hover.
    * ``"hover"``  - more than one hand but not all fists; UI hover only, so
      a stray second hand can never cause a stroke or an accidental erase.
    """
    if not states:
        return "none", None, None
    if len(states) >= 2 and all(s.gesture == Gesture.FIST for s in states):
        eraser = states[config.ERASE_HAND_INDEX if config.ERASE_HAND_INDEX < len(states) else 1]
        return "erase", states[0], eraser
    if len(states) == 1:
        return "single", states[0], None
    return "hover", states[0], None


class AirDrawingApp:
    """The main application: camera loop, gesture dispatch and export."""

    def __init__(self, args: argparse.Namespace) -> None:
        self.args = args
        self.camera = self._open_camera(args)
        ret, probe = self.camera.read()
        if not ret:
            self.camera.release()
            raise RuntimeError("Could not read a frame from the camera source.")
        self._frame_width, self._frame_height = probe.shape[1], probe.shape[0]
        print(
            f"[app] camera source={args.camera} -> "
            f"actual {self._frame_width}x{self._frame_height}"
        )
        if (self._frame_width, self._frame_height) != (args.width, args.height):
            print(
                "[app] note: requested "
                f"{args.width}x{args.height}; using the camera's native resolution"
            )
        self.tracker = HandTracker()
        self.classifier = GestureClassifier()
        self.canvas = VirtualCanvas()
        self.toolbar = Toolbar(self._frame_width, self._frame_height)
        self.hud = UIRenderer(self.toolbar)
        self.cleaner = SketchCleaner()

        self.ocr = None
        self.shapes = None
        self.formulas = None
        self.latex = None
        if not args.no_recognize:
            self.ocr = OCRRecognizer()
            self.shapes = ShapeRecognizer()
            self.formulas = FormulaDetector()
            self.latex = LatexConverter()

        # Gesture state machine
        self._cursor_smoothed: Optional[tuple[float, float]] = None
        self._prev_cursor: Optional[tuple[float, float]] = None
        self._pinch_frames = 0
        self._pinch_button: Optional[Button] = None
        self._drawing = False
        self._erasing = False
        self._last_erase_at = 0.0
        self._lost_frames = 0
        self._hand_seen = False
        self._status_text = ""
        self._status_until = 0.0
        self._last_recognition: dict = {}

    # ------------------------------------------------------------------
    # Setup
    # ------------------------------------------------------------------
    @staticmethod
    def _open_camera(args: argparse.Namespace) -> cv2.VideoCapture:
        source = args.camera
        if str(source).isdigit():
            camera = cv2.VideoCapture(int(source))
            if not camera.isOpened():
                raise RuntimeError(
                    f"Could not open camera {source}. Check the index with --camera."
                )
            camera.set(cv2.CAP_PROP_FRAME_WIDTH, args.width)
            camera.set(cv2.CAP_PROP_FRAME_HEIGHT, args.height)
        else:
            camera = cv2.VideoCapture(str(source))
            if not camera.isOpened():
                raise RuntimeError(
                    f"Could not open video source {source}. Check the path with --camera."
                )
        return camera

    # ------------------------------------------------------------------
    # Main loop
    # ------------------------------------------------------------------
    def run(self) -> None:
        """Run the interactive camera loop until the user quits."""
        last_time = time.monotonic()
        frame_interval = 1.0 / config.FPS_TARGET
        try:
            while True:
                frame_start = time.monotonic()
                ok, frame = self.camera.read()
                if not ok:
                    break
                frame = cv2.flip(frame, 1)  # mirror the feed like a mirror
                self._frame_width, self._frame_height = frame.shape[1], frame.shape[0]

                track_frame = frame
                if config.TRACKING_SCALE < 1.0:
                    track_frame = cv2.resize(
                        frame,
                        (0, 0),
                        fx=config.TRACKING_SCALE,
                        fy=config.TRACKING_SCALE,
                    )
                hands = self.tracker.process(track_frame)
                self._hand_seen = bool(hands)
                self._handle_gesture(hands, self._frame_width, self._frame_height)

                now = time.monotonic()
                fps = 1.0 / max(now - last_time, 1e-6)
                last_time = now

                frame = self._draw_scene(frame, fps)
                cv2.imshow(WINDOW_NAME, frame)
                if not self._handle_keys(cv2.waitKey(1) & 0xFF):
                    break

                # Throttle to FPS_TARGET so the loop does not peg the CPU.
                elapsed = time.monotonic() - frame_start
                sleep = frame_interval - elapsed
                if sleep > 0:
                    time.sleep(sleep)
        finally:
            self.close()

    def close(self) -> None:
        """Release camera, tracker and windows."""
        self.camera.release()
        self.tracker.close()
        cv2.destroyAllWindows()
        print("[app] closed")

    # ------------------------------------------------------------------
    # Gesture dispatch
    # ------------------------------------------------------------------
    def _handle_gesture(
        self, hands: list, frame_width: int, frame_height: int
    ) -> None:
        """Translate the visible hand poses into drawing / UI / erase actions.

        Rules: a **single** hand can draw (pinch) and drive the toolbar; a
        stray second hand never draws; erasing requires **two fists** at once
        (the configured hand drives the eraser).
        """
        states = [self.classifier.classify(h) for h in hands]
        mode, primary, eraser = resolve_mode(states)

        if mode == "none":
            # Tolerate brief tracking losses so a flicker does not end a stroke.
            self._lost_frames += 1
            if self._lost_frames >= LOST_FRAMES_TOLERANCE:
                self._end_active_stroke()
                self.toolbar.clear_hover()
                self._pinch_frames = 0
                self._pinch_button = None
                self._erasing = False
                self._cursor_smoothed = None
                self._prev_cursor = None
            return
        self._lost_frames = 0

        if mode == "erase":
            self._end_active_stroke()
            self._pinch_frames = 0
            self._pinch_button = None
            self.toolbar.clear_hover()
            self._erasing = True
            self._cursor_smoothed = None
            self._prev_cursor = None
            self._cursor_smoothed = self._smooth_cursor(eraser.cursor)
            canvas_point = self.canvas.map_normalized(*self._cursor_smoothed)
            now = time.monotonic()
            if now - self._last_erase_at >= config.ERASE_INTERVAL:
                self._last_erase_at = now
                erased = self.canvas.erase_at(canvas_point)
                if erased and not self._status_text:
                    self._flash_status(f"Erased {erased} points")
            return

        self._erasing = False
        self._cursor_smoothed = self._smooth_cursor(primary.cursor)
        canvas_point = self.canvas.map_normalized(*self._cursor_smoothed)
        ui_point = self._to_ui_point(self._cursor_smoothed)
        self.toolbar.set_hover(*ui_point)

        if primary.gesture == Gesture.PINCH:
            # A single hand may draw; with a second hand visible a pinch is
            # only ever a toolbar tap, so no stroke is ever started.
            self._handle_pinch(canvas_point, ui_point, allow_draw=(mode == "single"))
        else:
            self._handle_release()

    def _smooth_cursor(self, cursor: tuple[float, float]) -> tuple[float, float]:
        """Exponential moving average, more responsive while the hand moves.

        The alpha grows with fingertip speed so the cursor tracks fast
        movements (e.g. reaching for a toolbar button) almost one-to-one and
        only settles while the hand is (nearly) still.
        """
        if self._cursor_smoothed is None:
            self._prev_cursor = cursor
            return cursor
        prev = self._prev_cursor if self._prev_cursor is not None else cursor
        speed = math.dist(cursor, prev)
        alpha = min(1.0, config.CURSOR_SMOOTHING + speed * config.CURSOR_SPEED_GAIN)
        self._prev_cursor = cursor
        return (
            alpha * cursor[0] + (1 - alpha) * self._cursor_smoothed[0],
            alpha * cursor[1] + (1 - alpha) * self._cursor_smoothed[1],
        )

    def _handle_pinch(
        self,
        canvas_point: tuple[int, int],
        ui_point: tuple[int, int],
        allow_draw: bool = True,
    ) -> None:
        """A pinch draws a stroke, or is a tap when short and over the UI."""
        self._pinch_frames += 1
        if self._pinch_frames == 1:
            self._pinch_button = self.toolbar.hit_test(*ui_point)
            if allow_draw and self._pinch_button is None:
                self.canvas.begin_stroke(
                    canvas_point,
                    color_hex=self.toolbar.active_color,
                    thickness=self.toolbar.active_brush,
                )
                self._drawing = True
        elif self._drawing:
            self.canvas.extend_stroke(canvas_point)

    def _handle_release(self) -> None:
        """End the current stroke and fire a tap for a pinch over a button.

        A pinch that started on a toolbar button is a click whenever it is
        released (no timing trick needed), because it never draws anything.
        """
        was_pinch = self._pinch_frames > 0
        self._pinch_frames = 0
        self._erasing = False
        self._end_active_stroke()
        if was_pinch and self._pinch_button is not None:
            self._dispatch_button(self._pinch_button.id)
        self._pinch_button = None

    def _end_active_stroke(self) -> None:
        if self._drawing:
            self.canvas.end_stroke()
            self._drawing = False

    def _to_ui_point(self, cursor: tuple[float, float]) -> tuple[int, int]:
        return int(cursor[0] * self._frame_width), int(
            cursor[1] * self._frame_height
        )

    def _last_ui_point(self) -> tuple[int, int]:
        if self._cursor_smoothed is None:
            return 0, 0
        return self._to_ui_point(self._cursor_smoothed)

    def _dispatch_button(self, button_id: str) -> None:
        """Apply a toolbar button's action."""
        if button_id == "undo":
            self.canvas.undo() and self._flash_status("Undo")
        elif button_id == "redo":
            self.canvas.redo() and self._flash_status("Redo")
        elif button_id == "clear":
            self.canvas.clear_all()
            self._flash_status("Canvas cleared")
        elif button_id == "export":
            self._export()
        elif button_id == "recognize":
            self._recognize()
        else:
            self._flash_status("Selected " + self._button_label(button_id))

    def _button_label(self, button_id: str) -> str:
        if button_id.startswith("color:"):
            return button_id.split(":", 1)[1]
        if button_id.startswith("brush:"):
            return f"brush {button_id.split(':', 1)[1]}"
        return button_id

    # ------------------------------------------------------------------
    # Recognition & export
    # ------------------------------------------------------------------
    def _recognize(self) -> None:
        """Run OCR, shape recognition, diagram assembly and formula conversion."""
        if self.ocr is None:
            self._flash_status("Recognition disabled (--no-recognize)")
            return
        strokes = self.canvas.strokes()
        if not strokes:
            self._flash_status("Nothing to recognize")
            return

        regions = []
        if self.ocr.is_available():
            regions = self.ocr.recognize_regions(strokes)
        else:
            self._flash_status("Tesseract not installed - shapes only")

        shapes = self.shapes.recognize(strokes)
        diagram = self.shapes.build_diagram(shapes, regions)
        latex: list[str] = []
        for region in regions:
            formula = self.formulas.extract(region.text)
            if formula:
                latex.append(self.latex.to_latex(formula))

        self._last_recognition = {
            "text_regions": regions,
            "shapes": shapes,
            "diagram": diagram,
            "latex": latex,
        }
        self._flash_status(
            f"Recognized {len(regions)} text, {len(shapes)} shapes, {len(latex)} formulas"
        )

    def _export(self) -> None:
        """Export the canvas plus any recognition results to every format."""
        bundle = ExportBundle(
            canvas=self.canvas,
            text_regions=self._last_recognition.get("text_regions", []),
            shapes=self._last_recognition.get("shapes", []),
            diagram=self._last_recognition.get("diagram"),
            latex=self._last_recognition.get("latex", []),
        )
        base_name = "airdraw_" + time.strftime("%Y%m%d_%H%M%S")
        try:
            paths = export_all(bundle, base_name=base_name)
        except ExportError as exc:
            self._flash_status(f"Export failed: {exc}")
            return
        first = next(iter(paths.values()))
        self._flash_status(f"Exported to {first.parent}")

    # ------------------------------------------------------------------
    # Rendering
    # ------------------------------------------------------------------
    def _draw_scene(self, frame: np.ndarray, fps: float) -> np.ndarray:
        """Overlay the canvas strokes, toolbar, cursor and status on the feed."""
        canvas_image = self.canvas.render_scaled(
            frame.shape[1], frame.shape[0], include_active=True
        )
        white = cv2.inRange(canvas_image, (250, 250, 250), (255, 255, 255))
        strokes = cv2.bitwise_and(
            canvas_image, canvas_image, mask=cv2.bitwise_not(white)
        )
        background = cv2.bitwise_and(frame, frame, mask=white)
        frame = cv2.add(strokes, background)

        self.hud.draw_toolbar(frame)
        self.hud.draw_tracking_badge(frame, self._hand_seen)

        if self._cursor_smoothed is not None:
            gesture = self._current_gesture()
            position = self._last_ui_point()
            radius = None
            if gesture == Gesture.FIST:
                radius = int(
                    config.ERASE_RADIUS
                    * math.hypot(self._frame_width, self._frame_height)
                )
            self.hud.draw_cursor(frame, position, gesture, radius)

        fps_text = f"{fps:5.1f} fps"
        cv2.putText(
            frame,
            fps_text,
            (frame.shape[1] - 110, frame.shape[0] - 15),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (200, 200, 200),
            1,
        )

        if time.monotonic() < self._status_until:
            self.hud.draw_status(frame, self._status_text)
        return frame

    def _current_gesture(self) -> Gesture:
        if self._erasing:
            return Gesture.FIST
        if self._pinch_frames > 0:
            return Gesture.PINCH
        return Gesture.OPEN_PALM

    # ------------------------------------------------------------------
    # Keyboard shortcuts
    # ------------------------------------------------------------------
    def _handle_keys(self, key: int) -> bool:
        """Handle keyboard input; returns False when the app should quit."""
        if key in (27, ord("q"), ord("Q")):
            return False
        if key == ord("z"):
            self.canvas.undo()
        elif key == ord("y"):
            self.canvas.redo()
        elif key == ord("c"):
            self.canvas.clear_all()
            self._flash_status("Canvas cleared")
        elif key == ord("e"):
            self._export()
        elif key == ord("r"):
            self._recognize()
        elif key == ord("l"):
            layer_id = self.canvas.add_layer()
            self._flash_status(f"Added layer {layer_id}")
        elif key in (ord("1"), ord("2"), ord("3"), ord("4")):
            layer_id = key - ord("0")
            try:
                self.canvas.set_active_layer(layer_id - 1)
                self._flash_status(f"Active layer {layer_id - 1}")
            except ValueError:
                pass
        return True

    # ------------------------------------------------------------------
    # Status banner
    # ------------------------------------------------------------------
    def _flash_status(self, text: str) -> None:
        self._status_text = text
        self._status_until = time.monotonic() + STATUS_DURATION


def main() -> None:
    """Application entry point."""
    args = build_parser().parse_args()
    try:
        app = AirDrawingApp(args)
    except RuntimeError as exc:
        print(f"[error] {exc}")
        raise SystemExit(1)
    app.run()


if __name__ == "__main__":
    main()
