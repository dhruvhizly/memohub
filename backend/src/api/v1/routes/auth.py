import os
from src.db.db import get_db
from sqlalchemy.orm import Session
from src.core.config import UPLOAD_DIR
from src.models import User, RefreshToken
from src.typings.requests import AuthRequest
from passlib.context import CryptContext
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from src.utils.auth_utils import create_access_token, create_refresh_token, require_authentication 

router = APIRouter(prefix="/auth", tags=["auth"])

hasher = CryptContext(schemes=["argon2"], deprecated="auto")

@router.get("/status")
def status(request: Request, response: Response, db: Session = Depends(get_db)):
    return require_authentication(request, response, db)

@router.post("/signup")
def signup(request: AuthRequest, response: Response, db: Session = Depends(get_db)):
    username = request.username
    password = request.password

    existing_user = db.query(User).filter(User.username == username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")

    user = User(username=username, password_hash=hasher.hash(password))
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(user.id)
    refresh_token_str = create_refresh_token()

    refresh_token = RefreshToken(user_id=user.id, token=refresh_token_str)
    db.add(refresh_token)
    db.commit()

    cookie_params = dict(
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token_str,
        max_age=60 * 60 * 24 * 30,
        **cookie_params
    )

    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=60 * 1,
        **cookie_params
    )

    os.makedirs(os.path.join(UPLOAD_DIR, user.id), exist_ok=True)

    return user.id

@router.post("/login")
def login(request: AuthRequest, response: Response, db: Session = Depends(get_db)):
    username = request.username
    password = request.password

    user = db.query(User).filter(User.username == username).first()
    if not user or not hasher.verify(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    db.query(RefreshToken).filter(
        RefreshToken.user_id == user.id
    ).delete()
    db.commit()

    access_token = create_access_token(user.id)
    refresh_token_str = create_refresh_token()

    refresh_token = RefreshToken(user_id=user.id, token=refresh_token_str)
    db.add(refresh_token)
    db.commit()

    cookie_params = dict(
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token_str,
        max_age=60 * 60 * 24 * 30,
        **cookie_params
    )

    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=60 * 1,
        **cookie_params
    )

    os.makedirs(os.path.join(UPLOAD_DIR, user.id), exist_ok=True)

    return user.id

@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")

    if not refresh_token: 
        raise HTTPException(status_code=401, detail="Missing refresh token")

    token_entry = db.query(RefreshToken).filter(
        RefreshToken.token == refresh_token
    ).first()

    if not token_entry:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    db.delete(token_entry)
    db.commit()

    cookie_params = dict(
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )

    response.delete_cookie(
        key="access_token", 
        **cookie_params
    )

    response.delete_cookie(
        key="refresh_token",
        **cookie_params
    )

    return True
