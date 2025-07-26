from fastapi import APIRouter, HTTPException, status, Depends, Request, UploadFile, File
from fastapi.responses import JSONResponse, RedirectResponse
from auth_models import (
    UserCreate, 
    UserLogin, 
    UserResponse, 
    Token, 
    ForgotPassword, 
    ResetPassword, 
    RefreshToken,
    ChangePassword
)
from auth_database import AuthDatabase
from auth_service import AuthService
from email_service import EmailService
import logging
import os
import requests
from urllib.parse import urlencode
import secrets
import base64

# Initialize router and services
router = APIRouter(prefix="/auth", tags=["authentication"])
email_service = EmailService()

@router.post("/signup", response_model=dict)
async def signup(user_data: UserCreate):
    """Register a new user"""
    try:
        # Check if user already exists
        existing_user = AuthDatabase.get_user_by_email(user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create new user
        new_user = AuthDatabase.create_user(
            email=user_data.email,
            password=user_data.password,
            name=user_data.name
        )
        
        if not new_user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user"
            )
        
        # Send welcome email (non-blocking)
        try:
            email_service.send_welcome_email(user_data.email, user_data.name)
        except Exception as e:
            logging.warning(f"Failed to send welcome email: {str(e)}")
        
        # Create tokens
        access_token = AuthService.create_access_token(data={"sub": str(new_user["id"])})
        refresh_token = AuthService.create_refresh_token(data={"sub": str(new_user["id"])})
        
        return {
            "message": "User created successfully",
            "user": {
                "id": new_user["id"],
                "email": new_user["email"],
                "name": new_user["name"],
                "profileImage": new_user.get("profile_image")
            },
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Signup error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.post("/login", response_model=dict)
async def login(user_credentials: UserLogin):
    """Authenticate user and return tokens"""
    try:
        # Get user by email
        user = AuthDatabase.get_user_by_email(user_credentials.email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Verify password
        if not user.get("password_hash") or not AuthDatabase.verify_password(
            user_credentials.password, user["password_hash"]
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Create tokens
        access_token = AuthService.create_access_token(data={"sub": str(user["id"])})
        refresh_token = AuthService.create_refresh_token(data={"sub": str(user["id"])})
        
        return {
            "message": "Login successful",
            "user": {
                "id": user["id"],
                "email": user["email"],
                "name": user["name"],
                "profileImage": user.get("profile_image")
            },
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.post("/refresh", response_model=dict)
async def refresh_token(token_data: RefreshToken):
    """Refresh access token using refresh token"""
    try:
        logging.info(f"/auth/refresh called with token: {token_data.refresh_token}")
        new_access_token = AuthService.refresh_access_token(token_data.refresh_token)
        if not new_access_token:
            logging.warning(f"Refresh failed for token: {token_data.refresh_token}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        logging.info(f"Refresh succeeded for token: {token_data.refresh_token}")
        return {
            "access_token": new_access_token,
            "token_type": "bearer"
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Token refresh error: {str(e)} | token: {token_data.refresh_token}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.post("/forgot-password")
async def forgot_password(request: ForgotPassword):
    """Send OTP for password reset"""
    try:
        # Check if user exists
        user = AuthDatabase.get_user_by_email(request.email)
        if not user:
            # Don't reveal if email exists or not for security
            return {"message": "If your email is registered, you will receive an OTP"}
        
        # Generate and store OTP
        otp = AuthDatabase.generate_otp()
        if not AuthDatabase.store_otp(user["id"], otp):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate OTP"
            )
        
        # Send OTP email
        if not email_service.send_otp_email(request.email, otp, user["name"]):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send OTP email"
            )
        
        return {"message": "If your email is registered, you will receive an OTP"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Forgot password error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.post("/reset-password")
async def reset_password(request: ResetPassword):
    """Reset password using OTP"""
    try:
        # Get user by email
        user = AuthDatabase.get_user_by_email(request.email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email or OTP"
            )
        
        # Verify OTP
        if not AuthDatabase.verify_otp(user["id"], request.otp):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired OTP"
            )
        
        # Update password
        if not AuthDatabase.update_password(user["id"], request.new_password):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update password"
            )
        
        return {"message": "Password reset successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Reset password error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.post("/change-password")
async def change_password(
    request: ChangePassword,
    current_user: dict = Depends(AuthService.get_current_user_from_token)
):
    """Change user password (requires current password)"""
    try:
        # Verify current password
        if not current_user.get("password_hash") or not AuthDatabase.verify_password(
            request.current_password, current_user["password_hash"]
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        # Update password
        if not AuthDatabase.update_password(current_user["id"], request.new_password):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update password"
            )
        
        return {"message": "Password changed successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Change password error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.post("/logout")
async def logout(token_data: RefreshToken):
    """Logout user by invalidating refresh token"""
    try:
        success = AuthService.logout_user(token_data.refresh_token)
        if success:
            return {"message": "Logged out successfully"}
        else:
            return {"message": "Logout completed"}
            
    except Exception as e:
        logging.error(f"Logout error: {str(e)}")
        return {"message": "Logout completed"}

@router.get("/me", response_model=UserResponse)
async def get_current_user(current_user: dict = Depends(AuthService.get_current_user_from_token)):
    """Get current authenticated user"""
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        profile_image=current_user.get("profile_image"),
        oauth_provider=current_user.get("oauth_provider"),
        created_at=current_user["created_at"]
    )

@router.get("/check-auth")
async def check_auth(current_user: dict = Depends(AuthService.get_current_user_from_token)):
    """Check if user is authenticated"""
    return {"authenticated": True, "user_id": current_user["id"]}

@router.post("/session/extend")
async def extend_session(current_user: dict = Depends(AuthService.get_current_user_from_token)):
    """Extend the current session by issuing new tokens"""
    try:
        # Create new tokens
        access_token = AuthService.create_access_token(data={"sub": str(current_user["id"])})
        refresh_token = AuthService.create_refresh_token(data={"sub": str(current_user["id"])})
        
        return {
            "message": "Session extended successfully",
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
        
    except Exception as e:
        logging.error(f"Session extend error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to extend session"
        )

@router.post("/session/validate")
async def validate_session(current_user: dict = Depends(AuthService.get_current_user_from_token)):
    """Validate current session and return user info"""
    try:
        return {
            "valid": True,
            "user": {
                "id": current_user["id"],
                "email": current_user["email"],
                "name": current_user["name"]
            },
            "session_info": {
                "created_at": current_user.get("created_at"),
                "last_login": current_user.get("last_login")
            }
        }
        
    except Exception as e:
        logging.error(f"Session validation error: {str(e)}")
        return {"valid": False}

@router.get("/session/info")
async def get_session_info(current_user: dict = Depends(AuthService.get_current_user_from_token)):
    """Get information about the current session"""
    try:
        # Get refresh token info (you might want to extend AuthDatabase to track this)
        return {
            "user_id": current_user["id"],
            "email": current_user["email"],
            "session_created": current_user.get("created_at"),
            "last_activity": current_user.get("last_login"),
            "device_info": {
                "user_agent": "Unknown",  # You can extract this from headers
                "ip_address": "Unknown"   # You can extract this from request
            }
        }
        
    except Exception as e:
        logging.error(f"Get session info error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get session info"
        )

# OAuth Configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

@router.get("/google")
async def google_login():
    """Initiate Google OAuth login"""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth not configured"
        )
    
    # Generate state parameter for security
    state = secrets.token_urlsafe(32)
    
    # Google OAuth URL
    google_oauth_url = "https://accounts.google.com/o/oauth2/auth"
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": f"{os.getenv('BACKEND_URL', 'http://localhost:8000')}/auth/google/callback",
        "scope": "openid email profile",
        "response_type": "code",
        "state": state,
    }
    
    auth_url = f"{google_oauth_url}?{urlencode(params)}"
    return RedirectResponse(url=auth_url)

@router.get("/google/callback")
async def google_callback(code: str, state: str = None):
    """Handle Google OAuth callback"""
    try:
        # Exchange code for access token
        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": f"{os.getenv('BACKEND_URL', 'http://localhost:8000')}/auth/google/callback",
        }
        
        token_response = requests.post(token_url, data=token_data)
        token_json = token_response.json()
        
        if "access_token" not in token_json:
            raise HTTPException(status_code=400, detail="Failed to get access token")
        
        # Get user info from Google
        user_info_response = requests.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {token_json['access_token']}"}
        )
        user_info = user_info_response.json()
        
        # Get or create OAuth user
        user = AuthService.get_or_create_oauth_user(
            email=user_info["email"],
            name=user_info.get("name", ""),
            oauth_provider="google"
        )
        
        # Create tokens
        access_token = AuthService.create_access_token(data={"sub": str(user["id"])})
        refresh_token = AuthService.create_refresh_token(data={"sub": str(user["id"])})
        
        # Redirect to frontend with token
        frontend_url = f"{FRONTEND_URL}/login?token={access_token}&refresh_token={refresh_token}"
        return RedirectResponse(url=frontend_url)
        
    except Exception as e:
        logging.error(f"Google OAuth error: {str(e)}")
        error_url = f"{FRONTEND_URL}/login?error=OAuth authentication failed"
        return RedirectResponse(url=error_url)

@router.get("/github")
async def github_login():
    """Initiate GitHub OAuth login"""
    if not GITHUB_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GitHub OAuth not configured"
        )
    
    # Generate state parameter for security
    state = secrets.token_urlsafe(32)
    
    # GitHub OAuth URL
    github_oauth_url = "https://github.com/login/oauth/authorize"
    params = {
        "client_id": GITHUB_CLIENT_ID,
        "redirect_uri": f"{os.getenv('BACKEND_URL', 'http://localhost:8000')}/auth/github/callback",
        "scope": "user:email",
        "state": state,
    }
    
    auth_url = f"{github_oauth_url}?{urlencode(params)}"
    return RedirectResponse(url=auth_url)

@router.get("/github/callback")
async def github_callback(code: str, state: str = None):
    """Handle GitHub OAuth callback"""
    try:
        # Exchange code for access token
        token_url = "https://github.com/login/oauth/access_token"
        token_data = {
            "client_id": GITHUB_CLIENT_ID,
            "client_secret": GITHUB_CLIENT_SECRET,
            "code": code,
        }
        
        headers = {"Accept": "application/json"}
        token_response = requests.post(token_url, data=token_data, headers=headers)
        token_json = token_response.json()
        
        if "access_token" not in token_json:
            raise HTTPException(status_code=400, detail="Failed to get access token")
        
        # Get user info from GitHub
        user_info_response = requests.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"token {token_json['access_token']}",
                "Accept": "application/vnd.github.v3+json"
            }
        )
        user_info = user_info_response.json()
        
        # Get user email (GitHub might not return email in user info)
        email_response = requests.get(
            "https://api.github.com/user/emails",
            headers={
                "Authorization": f"token {token_json['access_token']}",
                "Accept": "application/vnd.github.v3+json"
            }
        )
        emails = email_response.json()
        primary_email = next((email["email"] for email in emails if email["primary"]), None)
        
        if not primary_email:
            raise HTTPException(status_code=400, detail="Unable to get email from GitHub")
        
        # Get or create OAuth user
        user = AuthService.get_or_create_oauth_user(
            email=primary_email,
            name=user_info.get("name", user_info.get("login", "")),
            oauth_provider="github"
        )
        
        # Create tokens
        access_token = AuthService.create_access_token(data={"sub": str(user["id"])})
        refresh_token = AuthService.create_refresh_token(data={"sub": str(user["id"])})
        
        # Redirect to frontend with token
        frontend_url = f"{FRONTEND_URL}/login?token={access_token}&refresh_token={refresh_token}"
        return RedirectResponse(url=frontend_url)
        
    except Exception as e:
        logging.error(f"GitHub OAuth error: {str(e)}")
        error_url = f"{FRONTEND_URL}/login?error=OAuth authentication failed"
        return RedirectResponse(url=error_url)
