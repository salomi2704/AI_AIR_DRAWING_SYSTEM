"""Export a LaTeX ``.tex`` report that includes the drawing.

Produces a self-contained LaTeX document that embeds the exported PNG (via
``\\includegraphics``), lists the recognised text, describes the detected
diagram and renders any recognised formulas in math mode.
"""

from __future__ import annotations

from pathlib import Path

import config
from export.bundle import ExportBundle


class TexExporter:
    """Generates a compilable ``.tex`` document from an ExportBundle."""

    def export(
        self,
        bundle: ExportBundle,
        path: Path | str,
        image_path: Path | str | None = None,
        title: str = "AI Air Drawing",
    ) -> Path:
        """Write the LaTeX report; returns the resolved path."""
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        lines = [
            "\\documentclass[11pt]{article}",
            "\\usepackage{graphicx}",
            "\\usepackage{amsmath}",
            "\\usepackage[margin=2.5cm]{geometry}",
            "\\begin{document}",
            f"\\title{{{title}}}",
            "\\author{AI Air Drawing System}",
            "\\date{\\today}",
            "\\maketitle",
            "\\section*{Drawing}",
        ]

        if image_path is not None:
            image = Path(image_path).name
            lines.append(f"\\begin{{center}}\\includegraphics[width=\\textwidth]{{{image}}}\\end{{center}}")

        lines.append("\\section{Summary}")
        if bundle.summary:
            lines.append(self._escape(bundle.summary))
        else:
            lines.append("No summary available.")

        lines.append("\\section{Recognised text}")
        if bundle.text_regions:
            lines.append("\\begin{itemize}")
            for region in bundle.text_regions:
                lines.append(
                    f"    \\item \\textbf{{{self._escape(region.text)}}} "
                    f"(confidence {region.confidence:.0f}\\%): {region.box}"
                )
            lines.append("\\end{itemize}")
        else:
            lines.append("No text was recognised.")

        lines.append("\\section{Detected diagram}")
        if bundle.diagram is not None and (bundle.diagram.nodes or bundle.diagram.edges):
            for node in bundle.diagram.nodes:
                label = self._escape(node.label) if node.label else "(no label)"
                lines.append(
                    f"{node.id}: {node.shape.kind} box {node.shape.bbox} \\{{ {label} \\}}"
                )
            for edge in bundle.diagram.edges:
                lines.append(
                    f"{edge.source} $\\to$ {edge.target} (arrow)"
                )
        else:
            lines.append("No diagram detected.")

        lines.append("\\section{Formulas}")
        if bundle.latex:
            for formula in bundle.latex:
                if formula.strip().startswith("$"):
                    lines.append(f"\\[ {formula.strip().strip('$')} \\]")
                else:
                    lines.append(f"\\[ {formula} \\]")
        else:
            lines.append("No formulas detected.")

        lines.append("\\end{document}")
        path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        return path

    @staticmethod
    def _escape(text: str) -> str:
        """Escape a few LaTeX-special characters in display text."""
        for char, replacement in (
            ("\\", r"\textbackslash{}"),
            ("&", r"\&"),
            ("%", r"\%"),
            ("$", r"\$"),
            ("#", r"\#"),
            ("_", r"\_"),
            ("{", r"\{"),
            ("}", r"\}"),
            ("~", r"\textasciitilde{}"),
            ("^", r"\textasciicircum{}"),
        ):
            text = text.replace(char, replacement)
        return text
