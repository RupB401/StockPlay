from datetime import datetime, timedelta
from typing import Optional
import jwt
import secrets
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
from dotenv import load_dotenv

import logging
from auth_database import AuthDatabase

load_dotenv("credentials.env")

# Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", secrets.token_urlsafe(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security scheme
security = HTTPBearer()

class AuthService:
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire, "type": "access"})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    @staticmethod
    def create_refresh_token(data: dict) -> str:
        """Create JWT refresh token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire, "type": "refresh"})
        
        token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        
        # Store in database
        user_id = data.get("sub")
        if user_id:
            AuthDatabase.store_refresh_token(int(user_id), token, REFRESH_TOKEN_EXPIRE_DAYS)
        
        return token

    @staticmethod
    def verify_token(token: str, token_type: str = "access") -> Optional[dict]:
        """Verify JWT token"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            if payload.get("type") != token_type:
                return None
            return payload
        except jwt.PyJWTError:
            return None

    @staticmethod
    def get_current_user_from_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
        """Get current user from JWT token"""
        token = credentials.credentials
        payload = AuthService.verify_token(token, "access")
        
        if payload is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user = AuthDatabase.get_user_by_id(int(user_id))
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return user

    @staticmethod
    def refresh_access_token(refresh_token: str) -> Optional[str]:
        """Create new access token from refresh token"""
        logging.info(f"refresh_access_token called with token: {refresh_token}")
        # Verify refresh token
        payload = AuthService.verify_token(refresh_token, "refresh")
        if not payload:
            logging.warning(f"refresh_access_token: Invalid JWT or wrong type for token: {refresh_token}")
            return None
        user_id = payload.get("sub")
        if not user_id:
            logging.warning(f"refresh_access_token: No sub in payload for token: {refresh_token}")
            return None
        # Verify token exists in database
        db_user_id = AuthDatabase.verify_refresh_token(refresh_token)
        if not db_user_id or db_user_id != int(user_id):
            logging.warning(f"refresh_access_token: Token not found in DB or user_id mismatch. DB user: {db_user_id}, JWT sub: {user_id}, token: {refresh_token}")
            return None
        # Create new access token
        access_token = AuthService.create_access_token(data={"sub": user_id})
        logging.info(f"refresh_access_token: Success for user_id {user_id}")
        return access_token

    @staticmethod
    def logout_user(refresh_token: str) -> bool:
        """Logout user by invalidating refresh token"""
        return AuthDatabase.delete_refresh_token(refresh_token)

    @staticmethod
    def create_oauth_user(email: str, name: str, oauth_provider: str) -> dict:
        """Create a new OAuth user"""
        # For OAuth users, we create a user with a random password they'll never use
        random_password = secrets.token_urlsafe(32)
        user = AuthDatabase.create_user(
            email=email,
            password=random_password,  # OAuth users get a random password
            name=name,
            oauth_provider=oauth_provider
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user"
            )
        
        return user

    @staticmethod
    def get_or_create_oauth_user(email: str, name: str, oauth_provider: str) -> dict:
        """Get existing OAuth user or create new one"""
        # Try to find existing user by email
        user = AuthDatabase.get_user_by_email(email)
        
        if user:
            # If user exists but doesn't have OAuth provider, update it
            if not user.get('oauth_provider'):
                # Update user to include OAuth provider
                AuthDatabase.update_user_oauth_provider(user['id'], oauth_provider)
                user['oauth_provider'] = oauth_provider
            return user
        else:
            # Create new OAuth user
            return AuthService.create_oauth_user(email, name, oauth_provider)
