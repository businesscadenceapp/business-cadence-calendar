"""Verify that the iPhone icon is composed exactly from the clean approved heart."""

import json
from pathlib import Path

from PIL import Image, ImageChops


CLEAN_HEART = Path("/home/ubuntu/webdev-static-assets/business-cadence-heart-clean.png")
IOS_ICON = Path(
    "/home/ubuntu/business-cadence-calendar/ios/App/App/Assets.xcassets/"
    "AppIcon.appiconset/AppIcon-512@2x.png"
)
BACKGROUND_COLOR = "#0F2440"


def main() -> None:
    with Image.open(CLEAN_HEART) as heart_source:
        heart = heart_source.convert("RGBA")
    expected = Image.new("RGBA", heart.size, BACKGROUND_COLOR)
    expected.alpha_composite(heart)
    with Image.open(IOS_ICON) as ios_source:
        ios = ios_source.convert("RGBA")

    if expected.size != (1024, 1024) or ios.size != (1024, 1024):
        raise ValueError(f"Expected 1024 x 1024 assets; received {expected.size} and {ios.size}")
    if ImageChops.difference(expected, ios).getbbox() is not None:
        raise ValueError("The iOS icon differs from the clean approved heart composition")

    print(json.dumps({"size": [1024, 1024], "clean_heart_composition": "exact"}))


if __name__ == "__main__":
    main()
