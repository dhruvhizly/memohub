from io import BytesIO
import os, re
import subprocess
import tempfile
from PIL import Image as PILImage
from src.core.config import FFMPEG_PATH


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
