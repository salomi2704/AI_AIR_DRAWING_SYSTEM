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
import time
from pathlib import Path
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

WINDOW_NAME = "AI Air Drawing"
ERASE_THROTTLE = 3  # commit an erase action every N fist frames
STATUS_DURATION = 2.5  # seconds the status banner stays visible


def build_parser() -> argparse.ArgumentParser:
    """Command-line options for the app."""
    parser = argparse.ArgumentParser(
        description="Gesture-based air drawing with recognition and export."
    )
    parser.add_argument(
        "--camera",
        type=int,
        default=config.CAMERA_INDEX,
        help="index of the camera to use",
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


class AirDrawingApp:
    """The main application: camera loop, gesture dispatch and export."""

    def __init__(self, args: argparse.Namespace) -> None:
        self.args = args
        self.camera = self._open_camera(args)
        self.tracker = HandTracker()
        self.classifier = GestureClassifier()
        self.canvas = VirtualCanvas()
        self.toolbar = Toolbar(config.CAMERA_WIDTH, config.CAMERA_HEIGHT)
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
        self._pinch_frames = 0
        self._pinch_over_ui = False
        self._drawing = False
        self._erase_frames = 0
        self._status_text = ""
        self._status_until = 0.0
        self._last_recognition: dict = {}

    # ------------------------------------------------------------------
    # Setup
    # ------------------------------------------------------------------
    @staticmethod
    def _open_camera(args: argparse.Namespace) -> cv2.VideoCapture:
        camera = cv2.VideoCapture(args.camera)
        if not camera.isOpened():
            raise RuntimeError(
                f"Could not open camera {args.camera}. Check the index with --camera."
            )
        camera.set(cv2.CAP_PROP_FRAME_WIDTH, args.width)
        camera.set(cv2.CAP_PROP_FRAME_HEIGHT, args.height)
        return camera

    # ------------------------------------------------------------------
    # Main loop
    # ------------------------------------------------------------------
    def run(self) -> None:
        """Run the interactive camera loop until the user quits."""
        last_time = time.monotonic()
        try:
            while True:
                ok, frame = self.camera.read()
                if not ok:
                    break
                frame = cv2.flip(frame, 1)  # mirror the feed like a mirror

                hands = self.tracker.process(frame)
                state = self.classifier.classify(hands[0]) if hands else None
                self._handle_gesture(state, frame.shape[1], frame.shape[0])

                now = time.monotonic()
                fps = 1.0 / max(now - last_time, 1e-6)
                last_time = now

                frame = self._draw_scene(frame, fps)
                cv2.imshow(WINDOW_NAME, frame)
                if not self._handle_keys(cv2.waitKey(1) & 0xFF):
                    break
        finally:
            self.close()

    def close(self) -> None:
        """Release camera, tracker and windows."""
        self.camera.release()
        self.tracker.close()
        cv2.destroyAllWindows()

    # ------------------------------------------------------------------
    # Gesture dispatch
    # ------------------------------------------------------------------
    def _handle_gesture(
        self, state, frame_width: int, frame_height: int
    ) -> None:
        """Translate the current gesture into drawing / UI / erase actions."""
        if state is None:
            self._end_active_stroke()
            self.toolbar.clear_hover()
            self._pinch_frames = 0
            return

        self._cursor_smoothed = self._smooth_cursor(state.cursor)
        canvas_point = self.canvas.map_normalized(*self._cursor_smoothed)
        ui_point = (
            int(self._cursor_smoothed[0] * frame_width),
            int(self._cursor_smoothed[1] * frame_height),
        )
        self.toolbar.set_hover(*ui_point)

        gesture = state.gesture
        if gesture == Gesture.PINCH:
            self._handle_pinch(canvas_point, ui_point)
        elif gesture == Gesture.FIST:
            self._handle_fist(canvas_point)
        elif gesture in (Gesture.OPEN_PALM, Gesture.NONE):
            self._handle_release()

    def _smooth_cursor(self, cursor: tuple[float, float]) -> tuple[float, float]:
        """Exponential moving average to stabilise the fingertip cursor."""
        alpha = config.CURSOR_SMOOTHING
        if self._cursor_smoothed is None:
            return cursor
        return (
            alpha * cursor[0] + (1 - alpha) * self._cursor_smoothed[0],
            alpha * cursor[1] + (1 - alpha) * self._cursor_smoothed[1],
        )

    def _handle_pinch(
        self, canvas_point: tuple[int, int], ui_point: tuple[int, int]
    ) -> None:
        """A pinch draws a stroke, or is a tap when short and over the UI."""
        self._pinch_frames += 1
        over_ui = self.toolbar.hit_test(*ui_point) is not None
        if self._pinch_frames == 1:
            self._pinch_over_ui = over_ui
            if not over_ui:
                self.canvas.begin_stroke(
                    canvas_point,
                    color_hex=self.toolbar.active_color,
                    thickness=self.toolbar.active_brush,
                )
                self._drawing = True
        elif self._drawing:
            self.canvas.extend_stroke(canvas_point)

    def _handle_fist(self, canvas_point: tuple[int, int]) -> None:
        """A fist erases a disc of stroke points under the fingertip."""
        self._end_active_stroke()
        self._pinch_frames = 0
        self._erase_frames += 1
        if self._erase_frames % ERASE_THROTTLE == 0:
            erased = self.canvas.erase_at(canvas_point)
            if erased and not self._status_text:
                self._flash_status(f"Erased {erased} points")

    def _handle_release(self) -> None:
        """End the current stroke and interpret a short pinch as a tap."""
        was_pinch = self._pinch_frames > 0
        self._pinch_frames = 0
        self._erase_frames = 0
        self._end_active_stroke()
        if was_pinch and self._pinch_over_ui:
            # Pinch was quick and over the toolbar -> a tap.
            button = self.toolbar.click(*self._last_ui_point())
            if button is not None:
                self._dispatch_button(button.id)

    def _end_active_stroke(self) -> None:
        if self._drawing:
            self.canvas.end_stroke()
            self._drawing = False

    def _last_ui_point(self) -> tuple[int, int]:
        return int(self._cursor_smoothed[0] * config.CAMERA_WIDTH), int(
            self._cursor_smoothed[1] * config.CAMERA_HEIGHT
        )

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
        canvas_image = self.canvas.render()
        canvas_image = cv2.resize(
            canvas_image, (frame.shape[1], frame.shape[0]), interpolation=cv2.INTER_AREA
        )
        mask = cv2.bitwise_not(cv2.inRange(canvas_image, (250, 250, 250), (255, 255, 255)))
        frame[mask > 0] = canvas_image[mask > 0]

        self.hud.draw_toolbar(frame)

        if self._cursor_smoothed is not None:
            gesture = self._current_gesture()
            position = self._last_ui_point()
            self.hud.draw_cursor(frame, position, gesture)

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
