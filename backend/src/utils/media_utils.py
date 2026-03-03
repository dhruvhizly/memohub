from io import BytesIO
import os, re
import subprocess
import tempfile

from PIL.Image import Image

def sanitize_filename(filename: str) -> str:
    # Remove path information and strictly allow alphanumeric + dots/dashes
    filename = os.path.basename(filename)
    return re.sub(r'[^a-zA-Z0-9_.-]', '_', filename)

def generate_video_thumbnail(video_bytes: bytes) -> bytes | None:
    print("Video size inside thumbnail fn:", len(video_bytes))

    tmp_video_path = None
    tmp_thumb_path = None

    try:
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp_video:
            tmp_video.write(video_bytes)
            tmp_video.flush()
            tmp_video_path = tmp_video.name
        
        print("Temp file size:", os.path.getsize(tmp_video_path))


        tmp_thumb_path = tmp_video_path + ".jpg"

        FFMPEG_PATH = "/usr/local/bin/ffmpeg"

        for timestamp in ["00:00:01.000", "00:00:00.000"]:

            cmd = [
                FFMPEG_PATH,
                "-y",
                "-ss", timestamp,              # fast seek BEFORE input
                "-i", tmp_video_path,
                "-frames:v", "1",
                "-q:v", "2",
                tmp_thumb_path
            ]

            process = subprocess.run(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )

            print("FFPROBE OUTPUT:", process.stdout)
            print("FFPROBE ERR:", process.stderr)

            if process.returncode == 0 and os.path.exists(tmp_thumb_path):
                break

        if not os.path.exists(tmp_thumb_path):
            print("FFmpeg failed:")
            print(process.stderr.decode("utf-8", errors="replace"))
            return Noneprint("Video size inside thumbnail fn:", len(video_bytes))


        with open(tmp_thumb_path, "rb") as f:
            img = Image.open(f)
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
        if tmp_video_path and os.path.exists(tmp_video_path):
            os.remove(tmp_video_path)
        if tmp_thumb_path and os.path.exists(tmp_thumb_path):
            os.remove(tmp_thumb_path)