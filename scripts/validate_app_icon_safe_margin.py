"""Validate the approved launcher icon's content-safe margins.

The approved heart uses saturated blue and orange strokes against a dark teal
background. This checker identifies those colored heart pixels, measures their
bounding box on the Android-safe 1024 x 1024 master, and requires a 144 px margin
on every edge. The margin is retained by Android density resampling.
"""

from __future__ import annotations

import json
from colorsys import rgb_to_hsv
from pathlib import Path

from PIL import Image


MASTER_ICON = Path("/home/ubuntu/webdev-static-assets/business-cadence-app-icon-android-safe.png")
EXPECTED_SIZE = (1024, 1024)
MINIMUM_SAFE_MARGIN = 144


def is_heart_pixel(red: int, green: int, blue: int) -> bool:
    hue, saturation, value = rgb_to_hsv(red / 255, green / 255, blue / 255)
    blue_ribbon = 0.55 <= hue <= 0.70 and saturation >= 0.30 and value >= 0.42
    orange_ribbon = 0.03 <= hue <= 0.14 and saturation >= 0.35 and value >= 0.35
    return blue_ribbon or orange_ribbon


def main() -> None:
    with Image.open(MASTER_ICON) as source:
        if source.size != EXPECTED_SIZE:
            raise ValueError(f"Expected {EXPECTED_SIZE}; received {source.size}")

        image = source.convert("RGB")
        detected_pixels = [
            (x, y)
            for y in range(image.height)
            for x in range(image.width)
            if is_heart_pixel(*image.getpixel((x, y)))
        ]

    if not detected_pixels:
        raise ValueError("No blue or orange heart pixels were detected")

    x_values, y_values = zip(*detected_pixels)
    bounds = {
        "left": min(x_values),
        "top": min(y_values),
        "right": max(x_values),
        "bottom": max(y_values),
    }
    margins = {
        "left": bounds["left"],
        "top": bounds["top"],
        "right": image.width - 1 - bounds["right"],
        "bottom": image.height - 1 - bounds["bottom"],
    }

    if min(margins.values()) < MINIMUM_SAFE_MARGIN:
        raise ValueError(
            f"Heart content does not meet the {MINIMUM_SAFE_MARGIN}px safety margin: {margins}"
        )

    print(json.dumps({"bounds": bounds, "margins": margins, "minimum": MINIMUM_SAFE_MARGIN}))


if __name__ == "__main__":
    main()
