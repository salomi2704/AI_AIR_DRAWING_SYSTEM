"""Unit tests for the virtual canvas engine (no camera required)."""

from __future__ import annotations

import unittest

import numpy as np

from canvas import VirtualCanvas


class CanvasMappingTest(unittest.TestCase):
    def setUp(self) -> None:
        self.canvas = VirtualCanvas(width=100, height=50)

    def test_origin_maps_to_top_left(self) -> None:
        self.assertEqual(self.canvas.map_normalized(0.0, 0.0), (0, 0))

    def test_bottom_right_maps_to_edge(self) -> None:
        self.assertEqual(self.canvas.map_normalized(1.0, 1.0), (99, 49))

    def test_center_maps_to_middle(self) -> None:
        self.assertEqual(self.canvas.map_normalized(0.5, 0.5), (50, 25))

    def test_out_of_range_is_clamped(self) -> None:
        self.assertEqual(self.canvas.map_normalized(-0.5, 2.0), (0, 49))

    def test_aspect_is_linear(self) -> None:
        self.assertEqual(self.canvas.map_normalized(0.25, 0.75), (25, 37))


class StrokeRecordingTest(unittest.TestCase):
    def setUp(self) -> None:
        self.canvas = VirtualCanvas(width=100, height=50)

    def test_begin_extend_end_adds_one_stroke(self) -> None:
        self.canvas.begin_stroke((10, 10))
        self.canvas.extend_stroke((20, 10))
        self.canvas.extend_stroke((30, 10))
        stroke = self.canvas.end_stroke()
        self.assertIsNotNone(stroke)
        self.assertEqual(len(self.canvas.strokes()), 1)
        self.assertEqual(stroke.points, [(10, 10), (20, 10), (30, 10)])

    def test_end_without_begin_is_safe(self) -> None:
        self.assertIsNone(self.canvas.end_stroke())

    def test_tiny_moves_are_filtered(self) -> None:
        self.canvas.begin_stroke((10, 10))
        self.canvas.extend_stroke((10, 11))  # < MIN_STROKE_DISTANCE
        self.canvas.end_stroke()
        stroke = self.canvas.strokes()[0]
        self.assertEqual(len(stroke.points), 1)

    def test_cancel_discards_in_progress_stroke(self) -> None:
        self.canvas.begin_stroke((10, 10))
        self.canvas.extend_stroke((40, 40))
        self.canvas.cancel_stroke()
        self.assertEqual(len(self.canvas.strokes()), 0)

    def test_active_layer_receives_stroke(self) -> None:
        layer_id = self.canvas.add_layer(name="Sketch")
        self.canvas.begin_stroke((1, 1), layer_id=layer_id)
        self.canvas.end_stroke()
        self.assertEqual(self.canvas.layer(layer_id).stroke_count, 1)
        self.assertEqual(self.canvas.layer(0).stroke_count, 0)


class UndoRedoTest(unittest.TestCase):
    def setUp(self) -> None:
        self.canvas = VirtualCanvas(width=100, height=50)

    def _draw_line(self, start=(0, 0), end=(40, 0)) -> None:
        self.canvas.begin_stroke(start)
        self.canvas.extend_stroke(end)
        self.canvas.end_stroke()

    def test_undo_removes_stroke(self) -> None:
        self._draw_line()
        self.assertEqual(len(self.canvas.strokes()), 1)
        self.assertTrue(self.canvas.undo())
        self.assertEqual(len(self.canvas.strokes()), 0)

    def test_redo_restores_stroke(self) -> None:
        self._draw_line()
        self.canvas.undo()
        self.assertTrue(self.canvas.redo())
        self.assertEqual(len(self.canvas.strokes()), 1)

    def test_undo_with_empty_history(self) -> None:
        self.assertFalse(self.canvas.undo())

    def test_new_action_clears_redo_stack(self) -> None:
        self._draw_line()
        self.canvas.undo()
        self._draw_line(end=(50, 0))
        self.assertFalse(self.canvas.redo())

    def test_erase_undo_restores_points(self) -> None:
        self.canvas.begin_stroke((10, 10))
        self.canvas.extend_stroke((10, 40))
        self.canvas.end_stroke()
        erased = self.canvas.erase_at((10, 10), radius=5)
        self.assertGreater(erased, 0)
        stroke = self.canvas.strokes()[0]
        self.assertEqual(stroke.points, [(10, 40)])
        self.canvas.undo()
        restored = self.canvas.strokes()[0]
        self.assertEqual(len(restored.points), 2)

    def test_erase_entire_stroke_undo_restores_stroke(self) -> None:
        self.canvas.begin_stroke((10, 10))
        self.canvas.extend_stroke((11, 10))
        self.canvas.end_stroke()
        self.canvas.erase_at((10, 10), radius=50)
        self.assertEqual(len(self.canvas.strokes()), 0)
        self.canvas.undo()
        self.assertEqual(len(self.canvas.strokes()), 1)
        self.canvas.redo()
        self.assertEqual(len(self.canvas.strokes()), 0)

    def test_clear_layer_undo_restores(self) -> None:
        self._draw_line()
        self._draw_line(start=(5, 5))
        self.canvas.clear_all()
        self.assertEqual(len(self.canvas.strokes()), 0)
        self.canvas.undo()
        self.assertEqual(len(self.canvas.strokes()), 2)
        self.canvas.redo()
        self.assertEqual(len(self.canvas.strokes()), 0)


class RenderingTest(unittest.TestCase):
    def setUp(self) -> None:
        self.canvas = VirtualCanvas(width=200, height=100)

    def test_blank_canvas_is_white(self) -> None:
        image = self.canvas.render()
        self.assertEqual(image.shape, (100, 200, 3))
        self.assertTrue(np.all(image == 255))

    def test_render_draws_stroke_pixels(self) -> None:
        self.canvas.begin_stroke((10, 50), color_hex="#000000", thickness=8)
        self.canvas.extend_stroke((150, 50))
        self.canvas.end_stroke()
        image = self.canvas.render()
        middle = image[50, 80]
        self.assertTrue(np.all(middle < 128), f"expected dark pixel, got {middle}")

    def test_hidden_layer_not_rendered(self) -> None:
        layer_id = self.canvas.add_layer()
        self.canvas.begin_stroke((0, 0), layer_id=layer_id)
        self.canvas.end_stroke()
        self.canvas.set_layer_visible(layer_id, False)
        self.assertTrue(np.all(self.canvas.render() == 255))

    def _draw_line(self) -> None:
        self.canvas.begin_stroke((10, 50), color_hex="#000000", thickness=8)
        self.canvas.extend_stroke((150, 50))
        self.canvas.end_stroke()

    def test_active_stroke_rendered_only_when_requested(self) -> None:
        self.canvas.begin_stroke((10, 50), color_hex="#000000", thickness=8)
        self.canvas.extend_stroke((150, 50))
        self.assertTrue(np.all(self.canvas.render() == 255))
        active = self.canvas.render(include_active=True)
        self.assertTrue(np.all(active[50, 80] < 128))

    def test_render_include_active_does_not_mutate_cache(self) -> None:
        self._draw_line()
        baseline = self.canvas.render()
        self.canvas.begin_stroke((10, 20), color_hex="#000000", thickness=8)
        self.canvas.extend_stroke((150, 20))
        self.canvas.render(include_active=True)
        after = self.canvas.render()
        self.assertTrue(np.all(after == baseline))

    def test_render_cache_reflects_commit(self) -> None:
        self.canvas.begin_stroke((10, 50), color_hex="#000000", thickness=8)
        self.canvas.extend_stroke((150, 50))
        self.assertTrue(np.all(self.canvas.render() == 255))
        self.canvas.end_stroke()
        self.assertTrue(np.all(self.canvas.render()[50, 80] < 128))

    def test_undo_and_redo_invalidate_render_cache(self) -> None:
        self._draw_line()
        self.assertTrue(np.all(self.canvas.render()[50, 80] < 128))
        self.canvas.undo()
        self.assertTrue(np.all(self.canvas.render() == 255))
        self.canvas.redo()
        self.assertTrue(np.all(self.canvas.render()[50, 80] < 128))

    def test_erase_invalidates_render_cache(self) -> None:
        self._draw_line()
        self.assertTrue(np.all(self.canvas.render()[50, 80] < 128))
        self.canvas.erase_at((80, 50), radius=75)
        self.assertTrue(np.all(self.canvas.render() == 255))

    def test_render_scaled_shape_and_content(self) -> None:
        self._draw_line()
        image = self.canvas.render_scaled(100, 50)
        self.assertEqual(image.shape, (50, 100, 3))
        self.assertTrue(np.all(image[25, 40] < 128))

    def test_render_scaled_reflects_mutations(self) -> None:
        self._draw_line()
        self.assertTrue(np.all(self.canvas.render_scaled(100, 50)[25, 40] < 128))
        self.canvas.undo()
        self.assertTrue(np.all(self.canvas.render_scaled(100, 50) == 255))
        self.canvas.redo()
        self.assertTrue(np.all(self.canvas.render_scaled(100, 50)[25, 40] < 128))


if __name__ == "__main__":
    unittest.main()
