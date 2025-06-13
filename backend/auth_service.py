import os
import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from google.auth.transport import requests
from google.oauth2 import id_token
from supabase import create_client, Client
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from config import settings

# Initialize Supabase client
if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY must be set")

supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

# JWT Configuration
JWT_SECRET = settings.JWT_SECRET
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Security
security = HTTPBearer()

class AuthService:
    @staticmethod
    def verify_google_token(token: str) -> Dict[str, Any]:
        """Verify Google ID token and return user info"""
        try:
            # Verify the token
            idinfo = id_token.verify_oauth2_token(
                token, 
                requests.Request(), 
                settings.GOOGLE_CLIENT_ID
            )
            
            # Verify the issuer
            if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
                raise ValueError('Wrong issuer.')
            
            return {
                'google_id': idinfo['sub'],
                'email': idinfo['email'],
                'name': idinfo.get('name', ''),
                'picture': idinfo.get('picture', '')
            }
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {str(e)}"
            )
    
    @staticmethod
    def create_or_update_user(user_info: Dict[str, Any]) -> Dict[str, Any]:
        """Create or update user in Supabase"""
        try:
            # Check if user exists
            existing_user = supabase.table("users").select("*").eq("google_id", user_info["google_id"]).execute()
            
            if existing_user.data:
                # Update existing user
                updated_user = supabase.table("users").update({
                    "name": user_info["name"],
                    "picture": user_info["picture"],
                    "last_login": datetime.utcnow().isoformat()
                }).eq("google_id", user_info["google_id"]).execute()
                
                return updated_user.data[0]
            else:
                # Create new user
                new_user = supabase.table("users").insert({
                    "google_id": user_info["google_id"],
                    "email": user_info["email"],
                    "name": user_info["name"],
                    "picture": user_info["picture"],
                    "provider": "google",
                    "last_login": datetime.utcnow().isoformat()
                }).execute()
                
                return new_user.data[0]
                
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {str(e)}"
            )
    
    @staticmethod
    def generate_jwt_token(user_data: Dict[str, Any]) -> str:
        """Generate JWT token for user"""
        payload = {
            "user_id": user_data["id"],
            "email": user_data["email"],
            "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
            "iat": datetime.utcnow()
        }
        
        return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    @staticmethod
    def verify_jwt_token(token: str) -> Dict[str, Any]:
        """Verify JWT token and return payload"""
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
    
    @staticmethod
    def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID from database"""
        try:
            result = supabase.table("users").select("*").eq("id", user_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {str(e)}"
            )

# Dependency to get current user from JWT token
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """FastAPI dependency to get current user from JWT token"""
    token = credentials.credentials
    payload = AuthService.verify_jwt_token(token)
    user = AuthService.get_user_by_id(payload["user_id"])
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user

# Optional dependency (allows unauthenticated access)
async def get_current_user_optional(credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))) -> Optional[Dict[str, Any]]:
    """FastAPI dependency to optionally get current user from JWT token"""
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None 