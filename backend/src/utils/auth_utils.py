import jwt, secrets
from datetime import datetime, timedelta, timezone
from src.core.config import JWT_ALGORITHM, JWT_SECRET_KEY, JWT_TOKEN_EXPIRE_MINUTES
from fastapi import Request, Response, HTTPException
from sqlalchemy.orm import Session
from src.models import User, RefreshToken

def create_access_token(userid: str, username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_TOKEN_EXPIRE_MINUTES)
    token = jwt.encode({"userid": userid, "username": username, "exp": expire}, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return token

def create_refresh_token() -> str:
    return secrets.token_urlsafe(32)

def refresh_access_token(refresh_token: str, response: Response, db: Session) -> dict:
    token_entry = db.query(RefreshToken).filter(
        RefreshToken.token == refresh_token
    ).first()

    if not token_entry:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = db.query(User).filter(User.id == token_entry.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(token_entry)
    db.commit()

    new_refresh_token_str = create_refresh_token()
    new_refresh_token = RefreshToken(
        user_id=user.id,
        token=new_refresh_token_str
    )
    db.add(new_refresh_token)
    db.commit()

    new_access_token = create_access_token(user.id, user.username)

    cookie_params = dict(
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )

    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token_str,
        max_age=60 * 60 * 24 * 30,
        **cookie_params
    )

    response.set_cookie(
        key="access_token",
        value=new_access_token,
        max_age=60 * 1,
        **cookie_params
    )
    return {"id": user.id, "name": user.username}

def check_access_token(request: Request) -> None:
    token = request.cookies.get("access_token")
    
    if not token:
        raise HTTPException(
            status_code=404,
            detail="Missing token"
        )

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM]
        )

        userid = payload.get("userid")
        if not userid:
            raise HTTPException(
                status_code=403,
                detail="Invalid token."
            )
        
        username = payload.get("username")
        if not username:
            raise HTTPException(
                status_code=403,
                detail="Invalid token."
            )

        request.state.userid = userid
        request.state.username = username
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Token expired"
        )
    except:
        print("ERROR")
        raise HTTPException(
            status_code=401,
            detail="Verification Error!"
        )
    
def require_authentication(request: Request, response: Response, db: Session) -> str:
    try:
        check_access_token(request)
        return {"id": request.state.userid, "name": request.state.username}

    except HTTPException as e:
        if e.status_code == 403:
            raise HTTPException(status_code=403, detail=e.detail)

        refresh_token = request.cookies.get("refresh_token")
        if not refresh_token:
            raise HTTPException(status_code=401, detail="User not logged in.")

        user_details = refresh_access_token(
            refresh_token=refresh_token,
            response=response,
            db=db
        )
        request.state.userid = user_details["id"]
        request.state.username = user_details["name"]
        return user_details