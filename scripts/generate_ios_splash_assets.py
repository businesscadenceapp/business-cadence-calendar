"""Generate Xcode Splash.imageset assets from the clean approved heart."""

from pathlib import Path

from PIL import Image


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
    if heart.size != (1024, 1024):
        raise ValueError(f"Expected a 1024 x 1024 clean heart; received {heart.size}")

    rendered_heart = heart.resize((HEART_SIZE, HEART_SIZE), Image.Resampling.LANCZOS)
    offset = (SPLASH_SIZE - HEART_SIZE) // 2
    for filename, background in APPEARANCE_BACKGROUNDS.items():
        canvas = Image.new("RGBA", (SPLASH_SIZE, SPLASH_SIZE), background)
        canvas.alpha_composite(rendered_heart, dest=(offset, offset))
        canvas.convert("RGB").save(SPLASH_DIRECTORY / filename, format="PNG", optimize=True)


if __name__ == "__main__":
    main()
