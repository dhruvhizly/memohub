import os, re, asyncio
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from src.db.db import get_db
from src.models import Media
from sqlalchemy.orm import Session
from fastapi.responses import StreamingResponse, RedirectResponse
from src.utils.auth_utils import require_authentication
from src.utils.media_utils import process_single_file, generate_background_thumbnail, bulk_file_cleanup
from src.core.config import UPLOAD_DIR, AES_KEY
from fastapi import APIRouter, UploadFile,  Request, HTTPException, Response, Depends, Query, File, BackgroundTasks
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from sqlalchemy.exc import SQLAlchemyError

router = APIRouter(prefix="/media", tags=["media"])

_executor = ThreadPoolExecutor(max_workers=4)

MAX_FILE_SIZE = 1 * 1024 * 1024 * 1024  # 1GB limit

CHUNK_SIZE = 64 * 1024

@router.post("/upload")
async def upload_media(
    request: Request,
    response: Response,
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
):
    require_authentication(request, response, db)
    user_id = request.state.userid

    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    user_dir = os.path.join(UPLOAD_DIR, str(user_id))
    os.makedirs(user_dir, exist_ok=True)

    # Process all files concurrently
    tasks = [
        asyncio.get_event_loop().run_in_executor(
            _executor, process_single_file, file, user_dir, user_id, CHUNK_SIZE
        )
        for file in files
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    media_records = []

    for result in results:
        if isinstance(result, Exception):
            raise HTTPException(status_code=400, detail=str(result))
        
        media_obj, _, _, stored_path, mime_type, nonce = result
        media_records.append(media_obj)
        
        if mime_type.startswith("video/"):
            background_tasks.add_task(generate_background_thumbnail, stored_path, mime_type, nonce)

    # Single batch commit for all files
    db.add_all(media_records)
    db.commit()
    
    uploaded_media = []
    for m in media_records:
        db.refresh(m)
        uploaded_media.append({
            "media_id": m.id,
            "filename": m.orig_name,
            "type": m.content_type,
            "size": m.size,
            "width": m.width,
            "height": m.height,
            "uploaded_at": m.uploaded_at,
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

    # If thumbnail doesn't exist yet (background task pending), return placeholder or 404
    if not os.path.exists(thumb_path):
        # Fallback: Redirect to view or return 404. 
        # For speed, we don't want to block on generation here if possible.
        return RedirectResponse(url=f"/api/v1/media/view/{media_id}")

    def iter_thumb():
        with open(thumb_path, "rb") as f:
            nonce = f.read(16)
            cipher = Cipher(algorithms.AES(AES_KEY), modes.CTR(nonce), backend=default_backend())
            decryptor = cipher.decryptor()
            while True:
                chunk = f.read(CHUNK_SIZE)
                if not chunk: break
                yield decryptor.update(chunk)
            yield decryptor.finalize()

    resp = StreamingResponse(iter_thumb(), media_type="image/jpeg")
    resp.headers["Cache-Control"] = "private, max-age=3600"
    return resp


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
    if media.owner_id != user_id: 
        raise HTTPException(403, "Forbidden request")

    file_path = media.stored_path
    total_file_size = media.size
    content_length = total_file_size # No tag in CTR

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
        # Calculate CTR offset
        # AES block size is 16 bytes
        block_index = start // 16
        offset_in_block = start % 16
        
        # Derive counter for the specific block
        nonce_int = int.from_bytes(media.nonce, "big")
        current_counter = nonce_int + block_index
        current_nonce = current_counter.to_bytes(16, "big")
        
        cipher = Cipher(
            algorithms.AES(AES_KEY),
            modes.CTR(current_nonce),
            backend=default_backend()
        )
        decryptor = cipher.decryptor()

        with open(file_path, "rb") as f:
            f.seek(block_index * 16)
            
            bytes_sent = 0
            first_chunk = True
            
            while bytes_sent < chunk_size_to_send:
                read_amount = min(CHUNK_SIZE, chunk_size_to_send - bytes_sent + offset_in_block)
                chunk = f.read(read_amount)
                if not chunk: 
                    break
                
                decrypted_chunk = decryptor.update(chunk)
                
                if first_chunk:
                    decrypted_chunk = decrypted_chunk[offset_in_block:]
                    first_chunk = False
                
                # Trim end if needed
                if len(decrypted_chunk) > (chunk_size_to_send - bytes_sent):
                    decrypted_chunk = decrypted_chunk[:chunk_size_to_send - bytes_sent]

                yield decrypted_chunk
                bytes_sent += len(decrypted_chunk)

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
    strm_resp.headers["Cache-Control"] = "private, max-age=3600"

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
        query = db.query(Media).filter(Media.owner_id == user_id, Media.in_bin == False)
        total = query.count()
        if total == 0:
            return {
                "total": 0, 
                "page": page, 
                "page_size": page_size, 
                "groups": []
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

    groups = {}
    now = datetime.now()

    for m in medias:
        diff = (now.date() - m.uploaded_at.date()).days

        if diff == 0:
            label = "Today"
        elif diff == 1:
            label = "Yesterday"
        elif 0 < diff < 7:
            label = "This Week"
        else:
            label = m.uploaded_at.strftime("%B %Y")

        if label not in groups:
            groups[label] = []

        groups[label].append({
            "media_id": m.id,
            "filename": m.orig_name,
            "type": m.content_type,
            "uploaded_at": m.uploaded_at,
            "size": m.size,
            "width": m.width,
            "height": m.height
        })

    for items in groups.values():
        items.sort(key=lambda x: x["uploaded_at"], reverse=True)

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "groups": [{"label": k, "items": v} for k, v in groups.items()]
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

    content_length = media.size

    def download_streamer():
        with open(file_path, "rb") as f:
            cipher = Cipher(
                algorithms.AES(AES_KEY),
                modes.CTR(media.nonce),
                backend=default_backend()
            )
            decryptor = cipher.decryptor()
            
            while True:
                chunk = f.read(CHUNK_SIZE)
                if not chunk: break
                
                yield decryptor.update(chunk)
            yield decryptor.finalize()
            
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

    media_records = (
        db.query(Media.id, Media.stored_path)
        .filter(Media.id.in_(media_ids), Media.owner_id == user_id)
        .all()
    )

    if not media_records:
        return {"detail": "No items found to delete", "deleted": []}

    # Extract paths and IDs before deleting from DB
    file_paths = [m.stored_path for m in media_records]
    deleted_ids = [m.id for m in media_records]
    file_paths.extend([p + ".thumb" for p in file_paths])

    try:
        # 2. Database transaction (Atomic)
        db.query(Media).filter(Media.id.in_(deleted_ids)).delete(synchronize_session=False)
        db.commit()
        
        # 3. Queue the slow disk I/O for later
        background_tasks.add_task(bulk_file_cleanup, file_paths)

    except Exception as e:
        db.rollback()
        print(f"Deletion failed for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Database error occurred")

    return {"status": "success", "deleted": deleted_ids}
