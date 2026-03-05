import uuid
from src.utils.load_key import load_key

# GENERAL
UPLOAD_DIR = "./data/"
MAX_UPLOAD = 30
CHUNK_SIZE = 1024 * 1024

# DATABASE
DATABASE_URL = "sqlite:///memohub_db.sqlite3"

# ENCRYPTION
AES_KEY = load_key("./src/encryption/server_key.bin")

# JWT
JWT_SECRET_KEY = "0350bcf3-ae87-45fc-a562-369952274813"
JWT_ALGORITHM = "HS256"
JWT_TOKEN_EXPIRE_MINUTES = 60

FFMPEG_PATH="/usr/local/bin/ffmpeg"
