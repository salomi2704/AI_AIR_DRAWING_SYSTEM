"""AI Air Drawing System - main application entry point.

Wires the whole pipeline together::

    tracking -> gesture interpreter -> canvas -> UI -> recognition -> export

The heavy lifting lives in ``core/`` (the gesture state machine, cursor
smoothing, frame pacing) and the feature packages; this module only owns the
camera loop, recognition/export triggers, keyboard shortcuts and rendering
composition.

Run with::

    python app.py            # webcam mode (gesture controlled)
    python app.py --help     # options

Gestures: pinch = draw / tap toolbar, two fists = erase, open palm = hover UI.
See GESTURES.md for the full mapping and README.md for setup.
"""

from __future__ import annotations

import argparse
import time

import cv2
import numpy as np

import config
from ai_assist import LatexConverter, SketchCleaner
from canvas import VirtualCanvas
from core import (
    FPSMeter,
    FramePacer,
    GestureInterpreter,
    SceneUpdate,
    apply_toolbar_action,
    resolve_mode,  # re-exported for backward compatibility
)
from export import ExportBundle, ExportError, export_all
from recognition import FormulaDetector, OCRRecognizer, ShapeRecognizer
from storage import AutosaveManager
from tracking import (
    GestureClassifier,
    HandTracker,
    LandmarkFilter,
)
from ui import Toolbar, UIRenderer

WINDOW_NAME = "AI Air Drawing"
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
    parser.add_argument(
        "--recover",
        action="store_true",
        help="restore the last autosaved session on startup",
    )
    return parser


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
        self.autosave = (
            AutosaveManager(self.canvas) if config.AUTOSAVE_ENABLED else None
        )
        if self.autosave is not None and args.recover:
            restored = AutosaveManager.load()
            if restored is not None:
                self.canvas = restored
                self.autosave = AutosaveManager(self.canvas)
                print(f"[app] recovered session from {self.autosave.path}")
            else:
                print("[app] --recover requested but no autosave found")
        self.interpreter = GestureInterpreter(self.canvas, self.toolbar)
        self._landmark_filter = (
            LandmarkFilter() if config.LANDMARK_SMOOTHING_ENABLED else None
        )
        self._last_frame_at: Optional[float] = None

        self.ocr = None
        self.shapes = None
        self.formulas = None
        self.latex = None
        if not args.no_recognize:
            self.ocr = OCRRecognizer()
            self.shapes = ShapeRecognizer()
            self.formulas = FormulaDetector()
            self.latex = LatexConverter()

        self._hand_seen = False
        self._status_text = ""
        self._status_until = 0.0
        self._last_recognition: dict = {}
        self._fps = FPSMeter()
        self._pacer = FramePacer()

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
                hands = self._smooth_hands(self.tracker.process(track_frame))
                self._hand_seen = bool(hands)
                if not hands:
                    self.classifier.reset()

                states = [self.classifier.classify(h) for h in hands]
                update = self.interpreter.update(
                    states, self._frame_width, self._frame_height
                )

                if update.tap_button is not None:
                    self._dispatch_button(update.tap_button)
                if update.status is not None and time.monotonic() >= self._status_until:
                    self._flash_status(update.status)
                if self.autosave is not None:
                    self.autosave.maybe_save()

                fps = self._fps.tick()
                frame = self._draw_scene(frame, update, fps)
                cv2.imshow(WINDOW_NAME, frame)
                if not self._handle_keys(cv2.waitKey(1) & 0xFF):
                    break

                # Throttle to FPS_TARGET so the loop does not peg the CPU.
                self._pacer.wait(frame_start)
        finally:
            self.close()

    def close(self) -> None:
        """Release camera, tracker and windows; save the session."""
        if self.autosave is not None:
            try:
                self.autosave.save()
            except OSError as exc:  # pragma: no cover - disk issues
                print(f"[app] autosave failed: {exc}")
        self.camera.release()
        self.tracker.close()
        cv2.destroyAllWindows()
        print("[app] closed")

    # ------------------------------------------------------------------
    # Toolbar dispatch
    # ------------------------------------------------------------------
    def _dispatch_button(self, button: object) -> None:
        """Apply a toolbar button's action; I/O actions run here in the app."""
        status = apply_toolbar_action(button, self.canvas, self.toolbar)
        if status is not None:
            self._flash_status(status)
            return
        button_id = getattr(button, "id", "")
        if button_id == "export":
            self._export()
        elif button_id == "recognize":
            self._recognize()

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
    # Tracking helpers
    # ------------------------------------------------------------------
    def _smooth_hands(self, hands: list) -> list:
        """Apply One-Euro landmark smoothing and track frame timing.

        With no hands visible the filter and timing state are reset so a hand
        that reappears starts with a clean history.
        """
        if not hands:
            if self._landmark_filter is not None:
                self._landmark_filter.reset()
            self._last_frame_at = None
            return hands
        now = time.monotonic()
        dt = now - self._last_frame_at if self._last_frame_at is not None else None
        self._last_frame_at = now
        if self._landmark_filter is None:
            return hands
        return [self._landmark_filter.filter_hand(h, dt=dt) for h in hands]

    # ------------------------------------------------------------------
    # Rendering
    # ------------------------------------------------------------------
    def _draw_scene(
        self, frame: np.ndarray, update: SceneUpdate, fps: float
    ) -> np.ndarray:
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

        if update.cursor is not None:
            position = (
                int(update.cursor[0] * self._frame_width),
                int(update.cursor[1] * self._frame_height),
            )
            self.hud.draw_cursor(frame, position, update.gesture, update.erase_radius)

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
