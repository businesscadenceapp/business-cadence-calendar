"""Verify iOS icon pixels equal the approved transparent heart on the brand background."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageChops


HEART = Path("/home/ubuntu/webdev-static-assets/business-cadence-heart-approved-source.png")
IOS_ICON = Path(
    "/home/ubuntu/business-cadence-calendar/ios/App/App/Assets.xcassets/"
    "AppIcon.appiconset/AppIcon-512@2x.png"
)
BACKGROUND_COLOR = (15, 36, 64, 255)


def main() -> None:
    with Image.open(HEART) as heart_source, Image.open(IOS_ICON) as ios_source:
        heart = heart_source.convert("RGBA")
        ios = ios_source.convert("RGBA")
        if heart.size != (1024, 1024) or ios.size != (1024, 1024):
            raise ValueError(f"Expected 1024 x 1024 assets; received {heart.size} and {ios.size}")

        expected = Image.new("RGBA", heart.size, BACKGROUND_COLOR)
        expected.alpha_composite(heart)
        if ImageChops.difference(expected, ios).getbbox() is not None:
            raise ValueError("The iOS icon differs from the approved heart on the brand background")

    print(json.dumps({"size": [1024, 1024], "composition_fidelity": "exact"}))


if __name__ == "__main__":
    main()
