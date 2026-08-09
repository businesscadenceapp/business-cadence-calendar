"""Render the reusable heart SVG onto a navy canvas for visual verification."""

from pathlib import Path

from cairosvg import svg2png


SVG = Path("/home/ubuntu/webdev-static-assets/business-cadence-heart-mark-manual.svg")
OUTPUT = Path("/home/ubuntu/webdev-static-assets/business-cadence-heart-mark-manual-preview.png")


svg2png(
    url=str(SVG),
    write_to=str(OUTPUT),
    output_width=1024,
    output_height=1024,
    background_color="#0F2440",
)

print(OUTPUT)
