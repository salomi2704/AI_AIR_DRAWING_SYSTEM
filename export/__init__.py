"""Export the final canvas to SVG, PNG, PDF and LaTeX.

Public API::

    from export import ExportBundle, SvgExporter, PngExporter, PdfExporter, TexExporter, export_all
"""

from __future__ import annotations

from pathlib import Path

import config
from export.bundle import ExportBundle
from export.json_exporter import JsonExporter
from export.pdf_exporter import PdfExporter
from export.png_exporter import PngExporter
from export.svg_exporter import SvgExporter
from export.tex_exporter import TexExporter

__all__ = [
    "ExportBundle",
    "ExportError",
    "JsonExporter",
    "PdfExporter",
    "PngExporter",
    "SvgExporter",
    "TexExporter",
    "export_all",
]


class ExportError(RuntimeError):
    """Raised when an export target is missing its dependency."""


def export_all(
    bundle: ExportBundle,
    output_dir: Path | str = config.EXPORT_DIR,
    base_name: str = "drawing",
) -> dict[str, Path]:
    """Export a bundle to every supported format.

    Returns a mapping of ``format -> Path`` for the generated files.  The
    LaTeX report embeds the exported PNG image.
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    svg_path = output_dir / f"{base_name}.svg"
    png_path = output_dir / f"{base_name}.png"
    pdf_path = output_dir / f"{base_name}.pdf"
    tex_path = output_dir / f"{base_name}.tex"
    json_path = output_dir / f"{base_name}.json"

    SvgExporter().export(bundle, svg_path)
    PngExporter().export(bundle, png_path)
    PdfExporter().export(bundle, pdf_path)
    TexExporter().export(bundle, tex_path, image_path=png_path)
    JsonExporter().export(bundle, json_path)

    return {
        "svg": svg_path,
        "png": png_path,
        "pdf": pdf_path,
        "tex": tex_path,
        "json": json_path,
    }
