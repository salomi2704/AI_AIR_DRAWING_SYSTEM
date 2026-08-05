"""Micro-benchmarks for the hot paths of the air-drawing pipeline.

Measures the expensive per-frame work (canvas rendering, white-key
compositing) and the recognition/classification steps headlessly, so the
impact of performance work can be tracked over time::

    python scripts/benchmark.py

Flags: ``--quick`` runs fewer repeats, ``--json out.json`` writes results.
"""

from __future__ import annotations

import argparse
import json
import time

import numpy as np

import config
from canvas import Stroke, VirtualCanvas
from canvas.composite import composite_mask_ops, composite_white_key
from recognition.shapes import ShapeRecognizer
from tracking import GestureClassifier, Hand, Landmark


def best_of(fn, repeats: int = 30) -> float:
    """Median-of-repeats wall time in milliseconds."""
    samples = []
    for _ in range(repeats):
        start = time.perf_counter()
        fn()
        samples.append((time.perf_counter() - start) * 1000.0)
    samples.sort()
    return samples[len(samples) // 2]


def _render_fresh(canvas: VirtualCanvas, width: int, height: int) -> np.ndarray:
    """Render from scratch by busting the internal dirty flag."""
    canvas._cache_dirty = True  # noqa: SLF001 - benchmark-only cache bust
    return canvas.render_scaled(width, height, include_active=True)


def _frame(width: int, height: int) -> np.ndarray:
    rng = np.random.default_rng(0)
    return rng.integers(0, 255, size=(height, width, 3), dtype=np.uint8)


def _busy_canvas(width: int, height: int) -> VirtualCanvas:
    """A canvas with a few dozen strokes across two layers."""
    canvas = VirtualCanvas(width=width, height=height)
    colors = ["#000000", "#E53935", "#1E88E5", "#43A047", "#8E24AA"]
    for i in range(40):
        canvas.begin_stroke(
            (i * 17 % width, 20 + i * 13 % (height - 100)),
            color_hex=colors[i % len(colors)],
            thickness=[4, 10, 22][i % 3],
        )
        for step in range(1, 50):
            canvas.extend_stroke(
                ((i * 17 + step * 11) % width, 20 + (i * 13 + step * 7) % (height - 100))
            )
        canvas.end_stroke()
    return canvas


def _hand() -> Hand:
    landmarks = [
        Landmark(x=0.1 + (i % 5) * 0.02, y=0.2 + (i % 7) * 0.015, z=0.0)
        for i in range(21)
    ]
    return Hand(landmarks=landmarks, handedness="Right", score=1.0)


def _shape_strokes() -> list[Stroke]:
    pts = []
    for i in range(80):
        ang = 2 * np.pi * i / 80
        pts.append((int(200 + 100 * np.cos(ang)), int(200 + 100 * np.sin(ang))))
    return [Stroke(points=pts)]


def bench_suite(width: int = 1280, height: int = 720, repeats: int = 30) -> dict:
    frame = _frame(width, height)
    half_frame = _frame(width // 2, height // 2)
    canvas = _busy_canvas(width, height)
    overlay = canvas.render_scaled(width, height)
    small_overlay = canvas.render_scaled(width // 2, height // 2)
    classifier = GestureClassifier()
    hand = _hand()
    recognizer = ShapeRecognizer()
    strokes = _shape_strokes()

    results: dict[str, dict] = {
        "composite_white_key_full": {
            "ms": best_of(
                lambda: composite_white_key(frame, overlay), repeats
            ),
        },
        "composite_mask_ops_full": {
            "ms": best_of(
                lambda: composite_mask_ops(frame, overlay), repeats
            ),
        },
        "composite_white_key_half": {
            "ms": best_of(
                lambda: composite_white_key(half_frame, small_overlay), repeats
            ),
        },
        "render_scaled_full": {
            "ms": best_of(
                lambda: _render_fresh(canvas, width, height), repeats
            ),
        },
        "render_scaled_half": {
            "ms": best_of(
                lambda: _render_fresh(canvas, width // 2, height // 2), repeats
            ),
        },
        "classify_hand": {
            "ms": best_of(lambda: classifier.classify(hand), repeats),
        },
        "recognize_100_strokes": {
            "ms": best_of(lambda: recognizer.recognize(strokes * 100), repeats),
        },
    }
    old_ms = results["composite_mask_ops_full"]["ms"]
    new_ms = results["composite_white_key_full"]["ms"]
    results["_summary"] = {
        "composite_speedup_x": round(old_ms / new_ms, 2) if new_ms else None,
        "half_res_render_saving_x": round(
            results["render_scaled_full"]["ms"]
            / results["render_scaled_half"]["ms"],
            2,
        )
        if results["render_scaled_half"]["ms"]
        else None,
    }
    return results


def _print_results(results: dict) -> None:
    width = 46
    print("-" * width)
    print(f"{'benchmark':<34}{'ms':>10}")
    print("-" * width)
    for name, entry in results.items():
        if name.startswith("_"):
            continue
        print(f"{name:<34}{entry['ms']:>10.3f}")
    print("-" * width)
    summary = results.get("_summary", {})
    for key, value in summary.items():
        print(f"{key:<34}{value if value is not None else 'n/a':>10}")
    print("-" * width)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--quick", action="store_true", help="fewer repeats")
    parser.add_argument("--json", type=str, help="write results to this file")
    args = parser.parse_args()

    results = bench_suite(
        width=config.CAMERA_WIDTH,
        height=config.CAMERA_HEIGHT,
        repeats=10 if args.quick else 30,
    )
    _print_results(results)
    if args.json:
        with open(args.json, "w", encoding="utf-8") as handle:
            json.dump(results, handle, indent=2)
        print(f"wrote {args.json}")


if __name__ == "__main__":
    main()
