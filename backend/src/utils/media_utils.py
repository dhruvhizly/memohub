import os, re, uuid, secrets, magic, subprocess, tempfile
from io import BytesIO
from fastapi import UploadFile
from PIL import Image, ImageOps, Image as PILImage
from src.models import Media
from src.core.config import AES_KEY, FFMPEG_PATH 
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

Image.MAX_IMAGE_PIXELS = 100_000_000

ALLOWED_MIME_TYPES = [
    "image/jpeg", 
    "image/png", 
    "image/gif", 
    "video/mp4"
]

IMAGE_FORMATS = {
    "image/jpeg": "JPEG",
    "image/png": "PNG",
}

def sanitize_filename(filename: str) -> str:
    filename = os.path.basename(filename)
    return re.sub(r'[^a-zA-Z0-9_.-]', '_', filename)

def generate_video_thumbnail(video_path: str) -> bytes | None:
    try:
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            tmp_path = tmp.name

        for timestamp in ["00:00:01.000", "00:00:00.000"]:
            result = subprocess.run(
                [FFMPEG_PATH, "-y", "-ss", timestamp, "-i", video_path,
                 "-frames:v", "1", "-q:v", "2", "-loglevel", "error", tmp_path],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE
            )
            if result.returncode == 0:
                break
        else:
            print("FFmpeg failed:", result.stderr.decode("utf-8", errors="replace"))
            return None

        img = PILImage.open(tmp_path)
        img.thumbnail((300, 300))
        buffer = BytesIO()
        img.save(buffer, format="JPEG")
        return buffer.getvalue()

    except FileNotFoundError:
        print("ffmpeg not installed or not in PATH.")
        return None
    except Exception as e:
        print(f"Video thumbnail error: {e}")
        return None
    finally:
        if 'tmp_path' in locals() and os.path.exists(tmp_path):
            os.remove(tmp_path)


def process_single_file(file: UploadFile, user_dir: str, user_id: str, chunk_size: int):
    """Runs in thread pool — CPU-bound work lives here."""
    # Read once, detect MIME from header
    file_content = file.file.read()
    mime_type = magic.from_buffer(file_content[:2048], mime=True)

    if mime_type not in ALLOWED_MIME_TYPES:
        raise ValueError(f"Invalid file content. Detected: {mime_type}")

    file_id = str(uuid.uuid4())
    stored_path = os.path.join(user_dir, file_id)
    nonce = secrets.token_bytes(16)
    cipher = Cipher(algorithms.AES(AES_KEY), modes.CTR(nonce), backend=default_backend())
    encryptor = cipher.encryptor()

    thumb_content = None
    file_size = 0
    width = None
    height = None

    if mime_type.startswith("image/"):
        img = Image.open(BytesIO(file_content))
        img.verify()
        img = Image.open(BytesIO(file_content))  # re-open after verify

        if mime_type in ("image/jpeg", "image/png"):
            img = ImageOps.exif_transpose(img)

        fmt = IMAGE_FORMATS.get(mime_type, "JPEG")
        if fmt == "JPEG":
            img = img.convert("RGB")
        width, height = img.size

        # Write encrypted image directly — no intermediate buffer needed
        buffer = BytesIO()
        img.save(buffer, format=fmt)
        processed_content = buffer.getvalue()
        file_size = len(processed_content)

        with open(stored_path, "wb") as f:
            f.write(encryptor.update(processed_content) + encryptor.finalize())

        # Thumbnail — reuse already-open img, avoid re-reading disk
        thumb_img = img.copy()
        thumb_img.thumbnail((300, 300), Image.Resampling.LANCZOS)
        thumb_buffer = BytesIO()
        thumb_img.save(thumb_buffer, format=fmt, optimize=True)
        thumb_content = thumb_buffer.getvalue()

    elif mime_type.startswith("video/"):
        with open(stored_path, "wb") as f:
            for i in range(0, len(file_content), chunk_size):
                chunk = file_content[i:i + chunk_size]
                f.write(encryptor.update(chunk))
                file_size += len(chunk)
            f.write(encryptor.finalize())

        try:
            result = subprocess.run(
                [FFMPEG_PATH, "-i", "pipe:0"],
                input=file_content[:10 * 1024 * 1024],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE
            )
            match = re.search(r"Video:.*?\s(\d{2,5})x(\d{2,5})\b", result.stderr.decode("utf-8", errors="ignore"))
            if match:
                width, height = int(match.group(1)), int(match.group(2))
        except Exception as e:
            print(f"Could not extract video dimensions: {e}")

    if thumb_content:
        thumb_nonce = secrets.token_bytes(16)
        thumb_cipher = Cipher(
            algorithms.AES(AES_KEY), modes.CTR(thumb_nonce), backend=default_backend()
        ).encryptor()
        with open(stored_path + ".thumb", "wb") as f:
            f.write(thumb_nonce + thumb_cipher.update(thumb_content) + thumb_cipher.finalize())

    media = Media(
        id=file_id,
        orig_name=sanitize_filename(file.filename),
        content_type=mime_type,
        stored_path=stored_path,
        width=width,
        height=height,
        nonce=nonce,
        size=file_size,
        owner_id=user_id,
    )

    media_dict = {
        "media_id": media.id,
        "filename": media.orig_name,
        "type": media.content_type,
        "size": media.size,
        "width": media.width,
        "height": media.height,
    }

    return media, media_dict, thumb_content, stored_path, mime_type, nonce

def generate_background_thumbnail(stored_path: str, mime_type: str, nonce: bytes):
    """Generates a thumbnail in the background by decrypting a small portion of the video."""
    try:
        temp_path = stored_path + ".tmp_dec"
        # Decrypt first 10MB for thumbnail generation
        cipher = Cipher(algorithms.AES(AES_KEY), modes.CTR(nonce), backend=default_backend())
        decryptor = cipher.decryptor()
        
        with open(stored_path, "rb") as enc_f, open(temp_path, "wb") as dec_f:
            chunk = enc_f.read(10 * 1024 * 1024)
            dec_f.write(decryptor.update(chunk))
            
        thumb_content = generate_video_thumbnail(temp_path)
        
        if thumb_content:
            thumb_nonce = secrets.token_bytes(16)
            thumb_cipher = Cipher(algorithms.AES(AES_KEY), modes.CTR(thumb_nonce), backend=default_backend()).encryptor()
            with open(stored_path + ".thumb", "wb") as f:
                f.write(thumb_nonce + thumb_cipher.update(thumb_content) + thumb_cipher.finalize())
                
    except Exception as e:
        print(f"Background thumbnail generation failed: {e}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def bulk_file_cleanup(paths: list[str]):
    """Background worker to clean up files without blocking the API."""
    for path in paths:
        try:
            if os.path.exists(path):
                os.remove(path)
        except Exception as e:
            print(f"Cleanup failed for path {path}: {e}")