"""Unit tests for autosave serialization and session recovery."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from canvas import VirtualCanvas
from storage import AutosaveManager, canvas_from_dict, canvas_to_dict


def draw_stroke(canvas: VirtualCanvas, layer_id: int = 0) -> object:
    canvas.begin_stroke((10, 20), color_hex="#E53935", thickness=8, layer_id=layer_id)
    canvas.extend_stroke((30, 40))
    canvas.extend_stroke((50, 60))
    return canvas.end_stroke()


class CanvasSerializerTest(unittest.TestCase):
    def test_round_trip_preserves_strokes_and_layers(self) -> None:
        canvas = VirtualCanvas(width=640, height=480)
        draw_stroke(canvas)
        layer2 = canvas.add_layer("Layer 2")
        draw_stroke(canvas, layer_id=layer2)
        canvas.set_active_layer(layer2)
        canvas.set_layer_visible(0, False)

        restored = canvas_from_dict(canvas_to_dict(canvas))

        self.assertEqual(restored.width, 640)
        self.assertEqual(restored.height, 480)
        self.assertEqual(restored.active_layer.id, layer2)
        self.assertEqual(len(restored.layers), 2)
        self.assertEqual(restored.layers[0].name, "Layer 1")
        self.assertFalse(restored.layers[0].visible)
        self.assertEqual(restored.layers[1].name, "Layer 2")
        self.assertEqual(restored.layers[1].stroke_count, 1)
        stroke = restored.layers[1].strokes[0]
        self.assertEqual(stroke.points, [(10, 20), (30, 40), (50, 60)])
        self.assertEqual(stroke.color_hex, "#E53935")
        self.assertEqual(stroke.thickness, 8)
        self.assertEqual(stroke.layer_id, layer2)
        self.assertEqual(restored.point_count, 6)

    def test_round_trip_is_deterministic_json(self) -> None:
        canvas = VirtualCanvas(width=100, height=100)
        draw_stroke(canvas)
        import json

        data = json.dumps(canvas_to_dict(canvas))
        self.assertIn('"version": 1', data)
        self.assertIn("#E53935", data)

    def test_active_layer_falls_back_to_first(self) -> None:
        canvas = VirtualCanvas(width=100, height=100)
        draw_stroke(canvas)
        data = canvas_to_dict(canvas)
        data["canvas"]["active_layer_id"] = 99  # a layer id that no longer exists
        restored = canvas_from_dict(data)
        self.assertEqual(restored.active_layer.id, 0)

    def test_version_mismatch_raises(self) -> None:
        with self.assertRaises(ValueError):
            canvas_from_dict({"version": 999, "canvas": {}, "layers": []})

    def test_non_object_payload_raises(self) -> None:
        with self.assertRaises(ValueError):
            canvas_from_dict([])

    def test_empty_layers_raise(self) -> None:
        data = {"version": 1, "canvas": {"width": 1, "height": 1}, "layers": []}
        with self.assertRaises(ValueError):
            canvas_from_dict(data)


class AutosaveManagerTest(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.path = Path(self._tmp.name) / "session" / "airdraw_autosave.json"
        self.canvas = VirtualCanvas(width=320, height=240)
        draw_stroke(self.canvas)

    def test_save_and_load_round_trip(self) -> None:
        manager = AutosaveManager(self.canvas, path=self.path, interval=0.0)
        manager.save()
        self.assertTrue(self.path.exists())
        restored = AutosaveManager.load(self.path)
        self.assertIsNotNone(restored)
        self.assertEqual(restored.point_count, self.canvas.point_count)
        self.assertEqual(
            restored.layers[0].strokes[0].points, [(10, 20), (30, 40), (50, 60)]
        )

    def test_load_returns_none_when_missing(self) -> None:
        self.assertIsNone(AutosaveManager.load(self.path))

    def test_no_leftover_tmp_files(self) -> None:
        manager = AutosaveManager(self.canvas, path=self.path, interval=0.0)
        manager.save()
        self.assertEqual(list(self.path.parent.glob("*.tmp")), [])

    def test_maybe_save_saves_when_interval_elapsed(self) -> None:
        manager = AutosaveManager(self.canvas, path=self.path, interval=0.0)
        saved = manager.maybe_save()
        self.assertIsNotNone(saved)
        self.assertTrue(Path(saved).exists())

    def test_maybe_save_skips_before_interval(self) -> None:
        manager = AutosaveManager(self.canvas, path=self.path, interval=3600.0)
        self.assertIsNone(manager.maybe_save())
        self.assertFalse(self.path.exists())

    def test_clear_removes_save(self) -> None:
        manager = AutosaveManager(self.canvas, path=self.path, interval=0.0)
        manager.save()
        AutosaveManager.clear(self.path)
        self.assertFalse(self.path.exists())

    def test_corrupt_file_raises_value_error(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text("{not json", encoding="utf-8")
        with self.assertRaises(ValueError):
            AutosaveManager.load(self.path)


if __name__ == "__main__":
    unittest.main()
