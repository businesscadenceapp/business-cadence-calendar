"""Generate native app icons from the clean approved heart PNG."""

from pathlib import Path

from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parents[1]
CLEAN_HEART = Path("/home/ubuntu/webdev-static-assets/business-cadence-heart-clean.png")
ANDROID_SAFE_MASTER = Path("/home/ubuntu/webdev-static-assets/business-cadence-app-icon-android-safe.png")
IOS_ICON = PROJECT_ROOT / "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"
ANDROID_RES = PROJECT_ROOT / "android/app/src/main/res"
BACKGROUND_COLOR = "#0F2440"
ANDROID_SAFE_SCALE = 0.82

ANDROID_ICON_SIZES = {
    "mipmap-ldpi": 36,
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}


def compose_clean_icon() -> Image.Image:
    if not CLEAN_HEART.exists():
        raise FileNotFoundError(f"Missing approved clean heart: {CLEAN_HEART}")
    with Image.open(CLEAN_HEART) as source:
        heart = source.convert("RGBA")
    if heart.size != (1024, 1024):
        raise ValueError(f"Expected 1024 x 1024 clean heart; received {heart.size}")

    canvas = Image.new("RGBA", heart.size, BACKGROUND_COLOR)
    canvas.alpha_composite(heart)
    return canvas


def main() -> None:
    ios_icon = compose_clean_icon()
    if ios_icon.size != (1024, 1024):
        raise ValueError(f"Expected 1024 x 1024 rendered icon; received {ios_icon.size}")

    IOS_ICON.parent.mkdir(parents=True, exist_ok=True)
    ios_icon.save(IOS_ICON, format="PNG", optimize=True)

    safe_size = round(ios_icon.width * ANDROID_SAFE_SCALE)
    offset = (ios_icon.width - safe_size) // 2
    android_safe_icon = Image.new("RGBA", ios_icon.size, BACKGROUND_COLOR)
    android_safe_icon.alpha_composite(
        ios_icon.resize((safe_size, safe_size), Image.Resampling.LANCZOS),
        dest=(offset, offset),
    )
    android_safe_icon.save(ANDROID_SAFE_MASTER, format="PNG", optimize=True)

    for density_dir, size in ANDROID_ICON_SIZES.items():
        destination = ANDROID_RES / density_dir
        destination.mkdir(parents=True, exist_ok=True)
        icon = android_safe_icon.resize((size, size), Image.Resampling.LANCZOS)
        for filename in ("ic_launcher.png", "ic_launcher_round.png", "ic_launcher_background.png"):
            icon.save(destination / filename, format="PNG", optimize=True)
        Image.new("RGBA", (size, size), (0, 0, 0, 0)).save(
            destination / "ic_launcher_foreground.png", format="PNG", optimize=True
        )


if __name__ == "__main__":
    main()
