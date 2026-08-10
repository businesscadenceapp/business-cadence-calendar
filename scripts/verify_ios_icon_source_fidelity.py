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
IOS_HEART_SCALE = 1.14


def main() -> None:
    with Image.open(CLEAN_HEART) as heart_source:
        heart = heart_source.convert("RGBA")
    expected = Image.new("RGBA", heart.size, BACKGROUND_COLOR)
    scaled_size = round(heart.width * IOS_HEART_SCALE)
    scaled_heart = heart.resize((scaled_size, scaled_size), Image.Resampling.LANCZOS)
    offset = (heart.width - scaled_size) // 2
    expected.alpha_composite(scaled_heart, dest=(offset, offset))
    with Image.open(IOS_ICON) as ios_source:
        ios = ios_source.convert("RGBA")

    if expected.size != (1024, 1024) or ios.size != (1024, 1024):
        raise ValueError(f"Expected 1024 x 1024 assets; received {expected.size} and {ios.size}")
    if ImageChops.difference(expected, ios).getbbox() is not None:
        raise ValueError("The iOS icon differs from the clean approved heart composition")

    print(json.dumps({"size": [1024, 1024], "clean_heart_scale": IOS_HEART_SCALE, "composition": "exact"}))


if __name__ == "__main__":
    main()
