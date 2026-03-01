import os, re

def sanitize_filename(filename: str) -> str:
    # Remove path information and strictly allow alphanumeric + dots/dashes
    filename = os.path.basename(filename)
    return re.sub(r'[^a-zA-Z0-9_.-]', '_', filename)