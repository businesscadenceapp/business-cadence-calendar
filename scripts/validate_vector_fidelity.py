"""Validate that the high-detail SVG retains the cleaned approved heart silhouette and color depth."""

from io import BytesIO
import json
from pathlib import Path

from cairosvg import svg2png
from PIL import Image
import numpy as np


SOURCE = Path("/home/ubuntu/webdev-static-assets/business-cadence-heart-clean.png")
VECTOR = Path("/home/ubuntu/webdev-static-assets/business-cadence-heart-high-fidelity.svg")


def main() -> None:
    with Image.open(SOURCE) as source_file:
        source = np.asarray(source_file.convert("RGBA"), dtype=np.int16)
    rendered = np.asarray(
        Image.open(BytesIO(svg2png(url=str(VECTOR), output_width=1024, output_height=1024))).convert("RGBA"),
        dtype=np.int16,
    )

    source_mask = source[..., 3] > 0
    vector_mask = rendered[..., 3] > 0
    union = source_mask | vector_mask
    overlap = source_mask & vector_mask
    coverage = float(overlap.sum() / union.sum()) if union.any() else 0.0

    if not overlap.any():
        raise ValueError("The vector has no overlap with the approved heart")

    mean_color_difference = float(np.abs(source[..., :3][overlap] - rendered[..., :3][overlap]).mean())
    if coverage < 0.92:
        raise ValueError(f"Vector silhouette coverage is too low: {coverage:.3f}")
    if mean_color_difference > 30:
        raise ValueError(f"Vector color/depth fidelity is too low: {mean_color_difference:.2f}")

    print(
        json.dumps(
            {
                "silhouette_coverage": round(coverage, 4),
                "mean_color_difference": round(mean_color_difference, 2),
                "fidelity": "approved",
            }
        )
    )


if __name__ == "__main__":
    main()
