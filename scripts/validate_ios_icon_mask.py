"""Confirm the approved iOS app icon stays inside a conservative launcher mask.

Apple applies a rounded-square mask to the 1024 px source. This validation uses
a 475 px-radius circular mask, which is more restrictive around every corner
than the iPhone rounded-square mask, to ensure the colored heart never reaches
a region likely to be clipped.
"""

from __future__ import annotations

import json
from colorsys import rgb_to_hsv
from math import hypot
from pathlib import Path

from PIL import Image


IOS_ICON = Path(
    "/home/ubuntu/business-cadence-calendar/ios/App/App/Assets.xcassets/"
    "AppIcon.appiconset/AppIcon-512@2x.png"
)
EXPECTED_SIZE = (1024, 1024)
MASK_RADIUS = 475


def is_heart_pixel(red: int, green: int, blue: int) -> bool:
    hue, saturation, value = rgb_to_hsv(red / 255, green / 255, blue / 255)
    blue_ribbon = 0.55 <= hue <= 0.70 and saturation >= 0.30 and value >= 0.42
    orange_ribbon = 0.03 <= hue <= 0.14 and saturation >= 0.35 and value >= 0.35
    return blue_ribbon or orange_ribbon


def main() -> None:
    with Image.open(IOS_ICON) as source:
        if source.size != EXPECTED_SIZE:
            raise ValueError(f"Expected {EXPECTED_SIZE}; received {source.size}")

        image = source.convert("RGB")
        center = (image.width - 1) / 2
        farthest_distance = 0.0
        heart_pixels = 0

        for y in range(image.height):
            for x in range(image.width):
                if is_heart_pixel(*image.getpixel((x, y))):
                    heart_pixels += 1
                    farthest_distance = max(farthest_distance, hypot(x - center, y - center))

    if heart_pixels == 0:
        raise ValueError("No blue or orange heart pixels were detected")
    if farthest_distance > MASK_RADIUS:
        raise ValueError(
            f"Heart reaches {farthest_distance:.1f}px from center, beyond the {MASK_RADIUS}px safe mask"
        )

    print(
        json.dumps(
            {
                "farthest_heart_pixel_distance": round(farthest_distance, 2),
                "safe_mask_radius": MASK_RADIUS,
                "remaining_corner_clearance": round(MASK_RADIUS - farthest_distance, 2),
            }
        )
    )


if __name__ == "__main__":
    main()
