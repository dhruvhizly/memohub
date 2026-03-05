import os, uuid, secrets, magic, re
from PIL import Image, ImageOps
from io import BytesIO
from src.db.db import get_db
from src.models import Media
from sqlalchemy.orm import Session
from fastapi.responses import StreamingResponse, RedirectResponse
from src.utils.auth_utils import require_authentication
from src.utils.media_utils import sanitize_filename, generate_video_thumbnail
from src.core.config import UPLOAD_DIR, MAX_UPLOAD, AES_KEY
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from fastapi import APIRouter, UploadFile,  Request, HTTPException, Response, Depends, Query, File, BackgroundTasks
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from sqlalchemy.exc import SQLAlchemyError

router = APIRouter(prefix="/media", tags=["media"])

print("Root listing:", os.listdir("/"))

MAX_FILE_SIZE = 1 * 1024 * 1024 * 1024  # 1GB limit
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

@router.post("/upload")
def upload_media(
    request: Request,
    response: Response,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
):
    require_authentication(request, response, db)
    user_id = request.state.userid

    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    user_dir = os.path.join(UPLOAD_DIR, str(user_id))
    os.makedirs(user_dir, exist_ok=True)

    uploaded_media = []

    for file in files:
        thumb_content = None
        file.file.seek(0)
        file_content = file.file.read()

        mime_type = magic.from_buffer(file_content[:2048], mime=True)

        if mime_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(400, f"Invalid file content. Detected: {mime_type}")

        # IMAGE
        if mime_type.startswith("image/"):
            img = Image.open(BytesIO(file_content))
            img.verify()
            img = Image.open(BytesIO(file_content))

            if mime_type in ("image/jpeg", "image/png"):
                img = ImageOps.exif_transpose(img)

            buffer = BytesIO()
            fmt = IMAGE_FORMATS.get(mime_type, "JPEG")
            if fmt == "JPEG":
                img = img.convert("RGB")
            img.save(buffer, format=fmt)
            file_content = buffer.getvalue()

            img.thumbnail((300, 300))
            thumb_buffer = BytesIO()
            img.save(thumb_buffer, format=fmt)
            thumb_content = thumb_buffer.getvalue()

        # VIDEO
        elif mime_type.startswith("video/"):
            temp_file_id = str(uuid.uuid4())
            temp_dir = os.path.join(user_dir, "tmp")
            os.makedirs(temp_dir, exist_ok=True)
            temp_path = os.path.join(temp_dir, temp_file_id)

            with open(temp_path, "wb") as f:
                f.write(file_content)
            
            try:
                thumb_content = generate_video_thumbnail(temp_path)
            finally:
                os.remove(temp_path)

        # ENCRYPT
        aesgcm = AESGCM(AES_KEY)
        nonce = secrets.token_bytes(12)
        ciphertext = aesgcm.encrypt(nonce, file_content, None)

        file_id = str(uuid.uuid4())
        stored_path = os.path.join(user_dir, file_id)

        with open(stored_path, "wb") as f:
            f.write(ciphertext)

        if thumb_content:
            thumb_nonce = secrets.token_bytes(12)
            thumb_cipher = aesgcm.encrypt(thumb_nonce, thumb_content, None)
            with open(stored_path + ".thumb", "wb") as f:
                f.write(thumb_nonce + thumb_cipher)

        media = Media(
            id=file_id,
            orig_name=sanitize_filename(file.filename),
            content_type=mime_type,
            stored_path=stored_path,
            nonce=nonce,
            size=len(file_content),
            owner_id=user_id,
        )

        db.add(media)
        db.commit()
        db.refresh(media)

        uploaded_media.append({
            "media_id": media.id,
            "filename": media.orig_name,
            "type": media.content_type,
            "size": media.size,
            "uploaded_at": media.uploaded_at,
        })

    return {"uploaded": uploaded_media}

@router.get("/thumbnail/{media_id}")
def get_thumbnail(
    media_id: str,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    require_authentication(request, response, db)
    user_id = request.state.userid

    media = db.query(Media).filter(Media.id == media_id).first()
    if not media:
        raise HTTPException(404, "Media not found")
    if media.owner_id != user_id:
        raise HTTPException(403, "Forbidden")

    thumb_path = media.stored_path + ".thumb"

    if not os.path.exists(thumb_path):
        aesgcm = AESGCM(AES_KEY)

        with open(media.stored_path, "rb") as f:
            enc_data = f.read()

        original_data = aesgcm.decrypt(media.nonce, enc_data, None)

        thumb_data = None

        if media.content_type.startswith("image/"):
            img = Image.open(BytesIO(original_data))
            img.thumbnail((300, 300))
            buffer = BytesIO()
            img.save(buffer, format="JPEG")
            thumb_data = buffer.getvalue()

        elif media.content_type.startswith("video/"):
            user_dir = os.path.dirname(media.stored_path)
            temp_dir = os.path.join(user_dir, "tmp")
            os.makedirs(temp_dir, exist_ok=True)
            temp_path = os.path.join(temp_dir, f"tmp_{media.id}")

            try:
                with open(temp_path, "wb") as f:
                    f.write(original_data)
                print("debug" + temp_path)
                thumb_data = generate_video_thumbnail(temp_path)
            finally:
                if os.path.exists(temp_path):
                    os.remove(temp_path)

        if not thumb_data:
            return RedirectResponse(url=f"/api/v1/media/view/{media_id}")

        thumb_nonce = secrets.token_bytes(12)
        thumb_enc = aesgcm.encrypt(thumb_nonce, thumb_data, None)

        with open(thumb_path, "wb") as f:
            f.write(thumb_nonce + thumb_enc)

    def iter_thumb():
        with open(thumb_path, "rb") as f:
            nonce = f.read(12)
            enc_data = f.read()
            aesgcm = AESGCM(AES_KEY)
            yield aesgcm.decrypt(nonce, enc_data, None)

    return StreamingResponse(iter_thumb(), media_type="image/jpeg")


@router.get("/view/{media_id}")
def view_media(
    media_id: str, 
    request: Request, 
    response: Response, 
    db: Session = Depends(get_db)
):
    require_authentication(request, response, db)
    
    user_id = request.state.userid
    if not user_id: 
        raise HTTPException(401, "Unauthorized")
    
    media = db.query(Media).filter(Media.id == media_id).first()
    if not media: 
        raise HTTPException(404, "Media not found")
    if media.owner.id != user_id: 
        raise HTTPException(403, "Forbidden request")

    file_path = media.stored_path
    TAG_SIZE = 16
    total_file_size = os.path.getsize(file_path)
    content_length = total_file_size - TAG_SIZE

    range_header = request.headers.get("range")
    start = 0
    end = content_length - 1
    
    if range_header:
        match = re.search(r"bytes=(\d+)-(\d*)", range_header)
        if match:
            start = int(match.group(1))
            if match.group(2):
                end = int(match.group(2))
    
    if start >= content_length or start > end:
        raise HTTPException(status_code=416, detail="Range not satisfiable")

    chunk_size_to_send = (end - start) + 1

    def range_decrypt_streamer():
        CHUNK_SIZE = 1024 * 1024
        
        with open(file_path, "rb") as f:
            f.seek(-TAG_SIZE, 2)
            tag = f.read(TAG_SIZE)
            
            cipher = Cipher(
                algorithms.AES(AES_KEY),
                modes.GCM(media.nonce, tag),
                backend=default_backend()
            )
            decryptor = cipher.decryptor()
            
            f.seek(0)
            current_pos = 0
            
            while current_pos < content_length:
                read_amount = min(CHUNK_SIZE, content_length - current_pos)
                chunk = f.read(read_amount)
                if not chunk: 
                    break
                
                decrypted_chunk = decryptor.update(chunk)
                
                chunk_start = current_pos
                chunk_end = current_pos + len(decrypted_chunk) - 1
                
                if chunk_end >= start and chunk_start <= end:
                    slice_start = max(0, start - chunk_start)
                    slice_end = min(len(decrypted_chunk), end - chunk_start + 1)
                    
                    yield decrypted_chunk[slice_start:slice_end]
                
                current_pos += len(chunk)

                if current_pos > end:
                    break

    headers = {
        "Content-Range": f"bytes {start}-{end}/{content_length}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(chunk_size_to_send),
        "Content-Disposition": f'inline; filename="{media.orig_name}"',
    }

    strm_resp = StreamingResponse(
        range_decrypt_streamer(),
        status_code=206,
        media_type=media.content_type,
        headers=headers
    )

    # Copy cookies to StreamingResponse header incase of a refresh of access_token
    cookies = response.headers.getlist("set-cookie")
    for cookie in cookies:
        strm_resp.headers.append("set-cookie", cookie)

    return strm_resp




@router.get("/")
def list_media(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50)
):
    require_authentication(request, response, db)
    
    user_id = request.state.userid
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    try:
        query = db.query(Media).filter(Media.owner_id == user_id)
        total = query.count()
        if total == 0:
            return {
                "total": 0, 
                "page": page, 
                "page_size": page_size, 
                "medias": []
            }
        
        medias = (
            query
            .order_by(Media.uploaded_at.desc(), Media.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )

    except SQLAlchemyError as e:
        print(f"Database error listing media: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "medias": [
            {
                "media_id": m.id,
                "filename": m.orig_name,
                "type": m.content_type,
                "uploaded_at": m.uploaded_at,
                "size": m.size
            } for m in medias
        ]
    }


@router.get("/download/{media_id}")
def download_media(
    media_id: str, 
    request: Request, 
    response: Response, 
    db: Session = Depends(get_db)
):
    require_authentication(request, response, db)
    
    user_id = request.state.userid
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    media = db.query(Media).filter(Media.id == media_id).first()
    if not media:
        raise HTTPException(404, "Media not found")

    if media.owner_id != user_id:
        raise HTTPException(403, "Forbidden request")
    
    file_path = media.stored_path
    if not os.path.exists(file_path):
        raise HTTPException(404, "File missing from disk")

    TAG_SIZE = 16
    file_size = os.path.getsize(file_path)
    content_length = file_size - TAG_SIZE

    def download_streamer():
        CHUNK_SIZE = 1024 * 1024
        
        with open(file_path, "rb") as f:
            f.seek(-TAG_SIZE, 2)
            tag = f.read(TAG_SIZE)
            
            cipher = Cipher(
                algorithms.AES(AES_KEY),
                modes.GCM(media.nonce, tag),
                backend=default_backend()
            )
            decryptor = cipher.decryptor()
            
            f.seek(0)
            bytes_processed = 0
            
            while bytes_processed < content_length:
                read_amount = min(CHUNK_SIZE, content_length - bytes_processed)
                chunk = f.read(read_amount)
                if not chunk: break
                
                yield decryptor.update(chunk)
                bytes_processed += len(chunk)
            
            try:
                decryptor.finalize()
            except Exception:
                print(f"Integrity error downloading {media_id}")
                raise HTTPException(500, "Integrity error")
            
    headers = {
        "Content-Disposition": f'attachment; filename="{media.orig_name}"',
        "Content-Length": str(content_length)
    }
            
    strm_resp = StreamingResponse(
        download_streamer(),
        media_type="application/octet-stream",
        headers=headers
    )

    # Copy cookies to StreamingResponse header incase of a refresh of access_token
    if hasattr(response.headers, "getlist"):
        cookies = response.headers.getlist("set-cookie")
        for cookie in cookies:
            strm_resp.headers.append("set-cookie", cookie)
    
    return strm_resp

@router.delete("/delete")
def delete_media(
    media_ids: list[str],
    request: Request,
    response: Response,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    require_authentication(request, response, db)

    user_id = request.state.userid
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    media_list = (
        db.query(Media)
        .filter(Media.id.in_(media_ids), Media.owner_id == user_id)
        .all()
    )

    if not media_list:
        return {"detail": "No items found to delete", "deleted": []}

    # Extract paths and IDs before deleting from DB
    file_paths = [m.stored_path for m in media_list]
    deleted_ids = [m.id for m in media_list]
    file_paths.extend([p + ".thumb" for p in file_paths])

    try:
        # 2. Database transaction (Atomic)
        for media in media_list:
            db.delete(media)
        db.commit()
        
        # 3. Queue the slow disk I/O for later
        background_tasks.add_task(bulk_file_cleanup, file_paths)

    except Exception as e:
        db.rollback()
        print(f"Deletion failed for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Database error occurred")

    return {"status": "success", "deleted": deleted_ids}


def bulk_file_cleanup(paths: list[str]):
    """Background worker to clean up files without blocking the API."""
    for path in paths:
        try:
            if os.path.exists(path):
                os.remove(path)
        except Exception as e:
            print(f"Cleanup failed for path {path}: {e}")
