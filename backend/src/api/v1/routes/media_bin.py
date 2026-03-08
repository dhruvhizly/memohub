from fastapi import APIRouter, Depends, Request, Response, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from src.db.db import get_db
from src.models import Media
from src.utils.auth_utils import require_authentication
from src.utils.media_utils import bulk_file_cleanup
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from sqlalchemy.exc import SQLAlchemyError

router = APIRouter(prefix="/bin", tags=["bin"])

class BinActionRequest(BaseModel):
    media_ids: list[str]

@router.post("/")
def move_to_bin(
    action: BinActionRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    require_authentication(request, response, db)
    user_id = request.state.userid
    
    if not action.media_ids:
        return {"status": "success", "binned": []}

    db.query(Media).filter(
        Media.id.in_(action.media_ids),
        Media.owner_id == user_id
    ).update({
        Media.in_bin: True,
        Media.binned_at: datetime.now(timezone.utc)
    }, synchronize_session=False)
    
    db.commit()
    return {"status": "success", "binned": action.media_ids}

@router.post("/restore")
def restore_from_bin(
    action: BinActionRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    require_authentication(request, response, db)
    user_id = request.state.userid

    if not action.media_ids:
        return {"status": "success", "restored": []}
    
    db.query(Media).filter(
        Media.id.in_(action.media_ids),
        Media.owner_id == user_id
    ).update({
        Media.in_bin: False,
        Media.binned_at: None
    }, synchronize_session=False)
    
    db.commit()
    return {"status": "success", "restored": action.media_ids}

@router.get("/")
def list_bin(
    request: Request,
    response: Response,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50)
):
    require_authentication(request, response, db)

    user_id = request.state.userid
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    try:
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=30)
        expired_media = db.query(Media.id, Media.stored_path).filter(
            Media.owner_id == user_id,
            Media.in_bin == True,
            Media.binned_at < cutoff_date
        ).all()

        if expired_media:
            expired_ids = [m.id for m in expired_media]
            file_paths = [m.stored_path for m in expired_media]
            file_paths.extend([p + ".thumb" for p in file_paths])

            db.query(Media).filter(Media.id.in_(expired_ids)).delete(synchronize_session=False)
            db.commit()
            background_tasks.add_task(bulk_file_cleanup, file_paths)
    except Exception as e:
        print(f"Error cleaning up bin: {e}")

    try :
        query = db.query(Media).filter(
            Media.owner_id == user_id,
            Media.in_bin == True
        )
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
    
    media_list = [
        {
            "media_id": m.id,
            "filename": m.orig_name,
            "type": m.content_type,
            "size": m.size,
            "uploaded_at": m.uploaded_at,
        }
        for m in sorted(medias, key=lambda m: m.binned_at, reverse=True)
]

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "medias": media_list
    }