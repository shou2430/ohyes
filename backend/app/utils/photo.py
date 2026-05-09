import io

from PIL import Image

MAX_DIMENSION = 1200
WEBP_QUALITY = 85
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


def validate_file_size(contents: bytes) -> None:
    """Raise ValueError if file exceeds 5 MB."""
    if len(contents) > MAX_FILE_SIZE:
        raise ValueError("File too large. Maximum size is 5 MB.")


def process_photo(file_contents: bytes) -> bytes:
    """Validate image, resize to max 1200px, convert to WebP.

    Raises ValueError if the input is not a valid image.
    """
    try:
        img = Image.open(io.BytesIO(file_contents))
        img.verify()
    except Exception:
        raise ValueError("Invalid image file.")

    # Re-open after verify (verify() consumes the image)
    img = Image.open(io.BytesIO(file_contents))

    # Convert palette and RGBA modes to RGB
    if img.mode in ("RGBA", "P", "LA"):
        img = img.convert("RGB")

    # Resize if larger than max dimension (preserves aspect ratio)
    img.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.LANCZOS)

    # Convert to WebP
    output = io.BytesIO()
    img.save(output, format="WebP", quality=WEBP_QUALITY)
    return output.getvalue()
