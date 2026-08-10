"""Render an email-safe PNG of the approved vector heart on the brand navy background."""

from io import BytesIO
from pathlib import Path

from cairosvg import svg2png
from PIL import Image


SOURCE = Path("/home/ubuntu/webdev-static-assets/business-cadence-heart-high-fidelity.svg")
OUTPUT = Path("/home/ubuntu/webdev-static-assets/business-cadence-heart-email.png")


rendered = svg2png(
    url=str(SOURCE),
    output_width=240,
    output_height=240,
    background_color="#0F2440",
)
image = Image.open(BytesIO(rendered)).convert("RGB")
image.save(OUTPUT, format="PNG", optimize=True)
print(OUTPUT)
