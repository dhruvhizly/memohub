import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

KEY_FILE = "server_key.bin"

if os.path.exists(KEY_FILE):
    print(f"{KEY_FILE} already exists. Keep it secret.")
else:
    key = AESGCM.generate_key(bit_length=256)
    with open(KEY_FILE, "wb") as f:
        f.write(key)
    print(f"Generated key -> {KEY_FILE}. KEEP THIS FILE SAFE.")
