"""Validate each Xcode Splash asset is the clean approved heart on its intended background."""

from pathlib import Path

from PIL import Image, ImageChops


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_HEART = Path("/home/ubuntu/webdev-static-assets/business-cadence-heart-clean.png")
SPLASH_DIRECTORY = PROJECT_ROOT / "ios/App/App/Assets.xcassets/Splash.imageset"
SPLASH_SIZE = 2732
HEART_SIZE = 920

APPEARANCE_BACKGROUNDS = {
    "Default@1x~universal~anyany.png": (15, 36, 64, 255),
    "Default@2x~universal~anyany.png": (15, 36, 64, 255),
    "Default@3x~universal~anyany.png": (15, 36, 64, 255),
    "Default@1x~universal~anyany-dark.png": (10, 25, 41, 255),
    "Default@2x~universal~anyany-dark.png": (10, 25, 41, 255),
    "Default@3x~universal~anyany-dark.png": (10, 25, 41, 255),
}


def main() -> None:
    with Image.open(SOURCE_HEART) as source_file:
        heart = source_file.convert("RGBA")
    rendered_heart = heart.resize((HEART_SIZE, HEART_SIZE), Image.Resampling.LANCZOS)
    offset = (SPLASH_SIZE - HEART_SIZE) // 2

    for filename, background in APPEARANCE_BACKGROUNDS.items():
        path = SPLASH_DIRECTORY / filename
        with Image.open(path) as image_file:
            actual = image_file.convert("RGBA")
        if actual.size != (SPLASH_SIZE, SPLASH_SIZE):
            raise ValueError(f"Unexpected splash size for {filename}: {actual.size}")
        expected = Image.new("RGBA", actual.size, background)
        expected.alpha_composite(rendered_heart, dest=(offset, offset))
        if ImageChops.difference(expected, actual).getbbox() is not None:
            raise ValueError(f"Splash asset differs from the clean approved heart: {filename}")

    print('{"splash_assets": 6, "clean_heart_composition": "exact"}')


if __name__ == "__main__":
    main()
