"""Unit tests for the toolbar layout / hit-testing (no camera required)."""

from __future__ import annotations

import unittest

from ui import Toolbar


class ToolbarLayoutTest(unittest.TestCase):
    def test_buttons_fit_within_frame_at_any_width(self) -> None:
        for width in (640, 800, 1280, 1920):
            toolbar = Toolbar(width, 720)
            right_edges = [b.rect[0] + b.rect[2] for b in toolbar.buttons]
            self.assertLessEqual(
                max(right_edges),
                width,
                msg=f"buttons overflow a {width}px wide frame",
            )

    def test_default_width_is_full_scale(self) -> None:
        toolbar = Toolbar(1280, 720)
        self.assertAlmostEqual(toolbar.scale, 1.0, places=2)

    def test_narrow_width_is_scaled_down(self) -> None:
        toolbar = Toolbar(640, 480)
        self.assertLess(toolbar.scale, 1.0)

    def test_first_color_button_sits_in_toolbar_strip(self) -> None:
        toolbar = Toolbar(1280, 720)
        first = toolbar.buttons[0]
        self.assertTrue(first.contains(12, toolbar.height // 2))

    def test_hit_test_below_toolbar_returns_none(self) -> None:
        toolbar = Toolbar(1280, 720)
        self.assertIsNone(toolbar.hit_test(100, toolbar.height + 10))


class ToolbarInteractionTest(unittest.TestCase):
    def setUp(self) -> None:
        self.toolbar = Toolbar(1280, 720)

    def test_click_color_updates_active_color(self) -> None:
        red = self.toolbar.button("color:#E53935")
        self.assertIsNotNone(red)
        self.toolbar.click(*red.center)
        self.assertEqual(self.toolbar.active_color, "#E53935")

    def test_click_brush_updates_active_brush(self) -> None:
        brush = self.toolbar.button("brush:22")
        self.assertIsNotNone(brush)
        self.toolbar.click(*brush.center)
        self.assertEqual(self.toolbar.active_brush, 22)

    def test_click_outside_does_nothing(self) -> None:
        self.toolbar.click(1, self.toolbar.height + 50)
        self.assertEqual(self.toolbar.active_color, "#000000")

    def test_set_hover_marks_single_button(self) -> None:
        red = self.toolbar.button("color:#E53935")
        hit = self.toolbar.set_hover(*red.center)
        self.assertIsNotNone(hit)
        self.assertTrue(hit.hovered)
        self.assertEqual(self.toolbar.hovered, hit)
        self.assertEqual(
            sum(1 for b in self.toolbar.buttons if b.hovered), 1
        )

    def test_clear_hover_resets_all(self) -> None:
        red = self.toolbar.button("color:#E53935")
        self.toolbar.set_hover(*red.center)
        self.toolbar.clear_hover()
        self.assertIsNone(self.toolbar.hovered)
        self.assertFalse(any(b.hovered for b in self.toolbar.buttons))


if __name__ == "__main__":
    unittest.main()
