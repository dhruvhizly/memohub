import uuid
from datetime import datetime

def generate_api_key():
    time = datetime.now()
    print(f"{uuid.uuid4()}_mEmoHuB_{time.strftime('%Y%m%d%H%M%S')}")

generate_api_key()