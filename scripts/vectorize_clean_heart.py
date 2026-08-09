"""Clean and trace the user-approved transparent heart into a reusable SVG."""

from __future__ import annotations

from colorsys import rgb_to_hsv
from pathlib import Path

from PIL import Image
import vtracer


SOURCE = Path("/home/ubuntu/webdev-static-assets/business-cadence-heart-approved-source.png")
CLEANED = Path("/home/ubuntu/webdev-static-assets/business-cadence-heart-clean.png")
VECTOR = Path("/home/ubuntu/webdev-static-assets/business-cadence-heart-mark.svg")


def is_approved_heart_color(red: int, green: int, blue: int) -> bool:
    hue, saturation, value = rgb_to_hsv(red / 255, green / 255, blue / 255)
    blue_family = 0.53 <= hue <= 0.72 and saturation >= 0.25 and value >= 0.15
    orange_family = 0.02 <= hue <= 0.15 and saturation >= 0.25 and value >= 0.18
    return blue_family or orange_family


def main() -> None:
    with Image.open(SOURCE) as original:
        source = original.convert("RGBA")
        if source.size != (1024, 1024):
            raise ValueError(f"Expected 1024 x 1024 source; received {source.size}")

        cleaned = Image.new("RGBA", source.size, (0, 0, 0, 0))
        for y in range(source.height):
            for x in range(source.width):
                red, green, blue, alpha = source.getpixel((x, y))
                # Remove low-opacity antialiased residue and only retain the blue
                # and orange heart color families. This removes the teal halo
                # without redrawing or changing the approved geometry.
                if alpha >= 128 and is_approved_heart_color(red, green, blue):
                    cleaned.putpixel((x, y), (red, green, blue, 255))
        cleaned.save(CLEANED, format="PNG", optimize=True)

    vtracer.convert_image_to_svg_py(
        str(CLEANED),
        str(VECTOR),
        colormode="color",
        hierarchical="cutout",
        mode="polygon",
        filter_speckle=24,
        color_precision=5,
        layer_difference=40,
        corner_threshold=60,
        length_threshold=5.0,
        max_iterations=10,
        splice_threshold=45,
        path_precision=8,
    )


if __name__ == "__main__":
    main()
