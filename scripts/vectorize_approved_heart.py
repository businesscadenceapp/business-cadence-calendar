"""Create a transparent, source-faithful vector heart from the approved icon.

The approved raster is used only as the source. Pixels belonging to the blue and
orange geometric heart are retained; the dark teal backdrop is removed. VTracer
then traces the retained color regions into SVG paths for reusable branding.
"""

from __future__ import annotations

from colorsys import rgb_to_hsv
from pathlib import Path

from PIL import Image
import vtracer


MASTER_ICON = Path("/home/ubuntu/webdev-static-assets/business-cadence-app-icon-master.png")
ISOLATED_HEART = Path("/home/ubuntu/webdev-static-assets/business-cadence-heart-isolated.png")
VECTOR_HEART = Path("/home/ubuntu/webdev-static-assets/business-cadence-heart-mark.svg")


def is_heart_pixel(red: int, green: int, blue: int) -> bool:
    hue, saturation, value = rgb_to_hsv(red / 255, green / 255, blue / 255)
    blue_ribbon = 0.55 <= hue <= 0.70 and saturation >= 0.23 and value >= 0.18
    orange_ribbon = 0.03 <= hue <= 0.14 and saturation >= 0.28 and value >= 0.25
    return blue_ribbon or orange_ribbon


def main() -> None:
    with Image.open(MASTER_ICON) as source:
        image = source.convert("RGBA")
        if image.size != (1024, 1024):
            raise ValueError(f"Expected 1024 x 1024 approved source; received {image.size}")

        isolated = Image.new("RGBA", image.size, (0, 0, 0, 0))
        for y in range(image.height):
            for x in range(image.width):
                red, green, blue, alpha = image.getpixel((x, y))
                if alpha and is_heart_pixel(red, green, blue):
                    isolated.putpixel((x, y), (red, green, blue, alpha))
        isolated.save(ISOLATED_HEART, format="PNG", optimize=True)

    vtracer.convert_image_to_svg_py(
        str(ISOLATED_HEART),
        str(VECTOR_HEART),
        colormode="color",
        hierarchical="cutout",
        mode="spline",
        filter_speckle=18,
        color_precision=5,
        layer_difference=28,
        corner_threshold=60,
        length_threshold=4.0,
        max_iterations=10,
        splice_threshold=45,
        path_precision=8,
    )


if __name__ == "__main__":
    main()
