"""Verify that the iPhone icon is rendered exactly from the approved vector heart."""

from io import BytesIO
import json
from pathlib import Path

from cairosvg import svg2png
from PIL import Image, ImageChops


VECTOR_HEART = Path("/home/ubuntu/webdev-static-assets/business-cadence-heart-high-fidelity.svg")
IOS_ICON = Path(
    "/home/ubuntu/business-cadence-calendar/ios/App/App/Assets.xcassets/"
    "AppIcon.appiconset/AppIcon-512@2x.png"
)
BACKGROUND_COLOR = "#0F2440"


def main() -> None:
    expected = Image.open(
        BytesIO(
            svg2png(
                url=str(VECTOR_HEART),
                output_width=1024,
                output_height=1024,
                background_color=BACKGROUND_COLOR,
            )
        )
    ).convert("RGBA")
    with Image.open(IOS_ICON) as ios_source:
        ios = ios_source.convert("RGBA")

    if expected.size != (1024, 1024) or ios.size != (1024, 1024):
        raise ValueError(f"Expected 1024 x 1024 assets; received {expected.size} and {ios.size}")
    if ImageChops.difference(expected, ios).getbbox() is not None:
        raise ValueError("The iOS icon differs from the approved vector render")

    print(json.dumps({"size": [1024, 1024], "vector_render_fidelity": "exact"}))


if __name__ == "__main__":
    main()
