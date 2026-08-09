"""Trace the approved transparent heart into a high-detail editable SVG."""

from pathlib import Path

import vtracer


SOURCE = Path("/home/ubuntu/webdev-static-assets/business-cadence-heart-clean.png")
OUTPUT = Path("/home/ubuntu/webdev-static-assets/business-cadence-heart-high-fidelity.svg")


vtracer.convert_image_to_svg_py(
    str(SOURCE),
    str(OUTPUT),
    colormode="color",
    hierarchical="cutout",
    mode="spline",
    filter_speckle=2,
    color_precision=8,
    layer_difference=12,
    corner_threshold=60,
    length_threshold=3.5,
    max_iterations=10,
    splice_threshold=45,
    path_precision=8,
)

print(OUTPUT)
