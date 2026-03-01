import os

def load_key(KEY_FILE) -> bytes:
    if not os.path.exists(KEY_FILE):
        raise SystemExit(f"Encryption key not found: {KEY_FILE}. Run create_key.py first.")
    with open(KEY_FILE, "rb") as kf:
        return kf.read()