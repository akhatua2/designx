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
import logging

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

logger = logging.getLogger(__name__)

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
        logger.info(f"🔄 create_or_update_user called for: {user_info.get('email', 'NO_EMAIL')}")
        logger.info(f"📊 User info: {user_info}")
        
        try:
            # Check if user exists
            logger.info(f"🔍 Checking for existing user with google_id: {user_info['google_id']}")
            existing_user = supabase.table("users").select("*").eq("google_id", user_info["google_id"]).execute()
            logger.info(f"📊 Existing user query result: {existing_user.data}")
            
            if existing_user.data:
                logger.info("📝 Updating existing user...")
                # Update existing user
                updated_user = supabase.table("users").update({
                    "name": user_info["name"],
                    "picture": user_info["picture"],
                    "last_login": datetime.utcnow().isoformat()
                }).eq("google_id", user_info["google_id"]).execute()
                
                logger.info(f"📊 Updated user result: {updated_user.data}")
                user_data = updated_user.data[0]
                logger.info(f"✅ User updated successfully: {user_data.get('email', 'NO_EMAIL')}")
                return user_data
            else:
                logger.info("🆕 Creating new user...")
                # Create new user
                new_user = supabase.table("users").insert({
                    "google_id": user_info["google_id"],
                    "email": user_info["email"],
                    "name": user_info["name"],
                    "picture": user_info["picture"],
                    "provider": "google",
                    "last_login": datetime.utcnow().isoformat()
                }).execute()
                
                logger.info(f"📊 New user result: {new_user.data}")
                user_data = new_user.data[0]
                logger.info(f"✅ User created successfully: {user_data.get('email', 'NO_EMAIL')}")
                logger.info(f"📊 New user ID: {user_data.get('id')}")
                return user_data
                
        except Exception as e:
            logger.error(f"❌ Database error in create_or_update_user: {str(e)}")
            logger.error(f"📊 Error type: {type(e)}")
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
        logger.info(f"🔍 get_user_by_id called with ID: {user_id}")
        try:
            logger.info("📡 Executing Supabase query...")
            result = supabase.table("users").select("*").eq("id", user_id).execute()
            logger.info(f"📊 Supabase result: {result}")
            logger.info(f"📊 Result data: {result.data}")
            logger.info(f"📊 Result count: {result.count}")
            
            if result.data:
                user = result.data[0]
                logger.info(f"✅ Found user: {user.get('email', 'NO_EMAIL')}")
                return user
            else:
                logger.warning(f"⚠️ No user found with ID: {user_id}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Database error in get_user_by_id: {str(e)}")
            logger.error(f"📊 Error type: {type(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {str(e)}"
            )

# Dependency to get current user from JWT token
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """FastAPI dependency to get current user from JWT token"""
    logger.info("🔍 get_current_user called")
    
    token = credentials.credentials
    logger.info(f"📝 Token received: {token[:20]}..." if token else "❌ No token")
    
    try:
        payload = AuthService.verify_jwt_token(token)
        logger.info(f"📊 JWT payload: {payload}")
        
        user_id = payload.get("user_id")
        if not user_id:
            logger.error("❌ No user_id in JWT payload")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token: missing user_id"
            )
        
        logger.info(f"🔍 Looking up user with ID: {user_id}")
        user = AuthService.get_user_by_id(user_id)
        logger.info(f"📊 Database returned user: {user}")
        
        if not user:
            logger.error(f"❌ User not found in database with ID: {user_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        logger.info(f"✅ Returning user: {user.get('email', 'NO_EMAIL')}")
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error in get_current_user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication error: {str(e)}"
        )

# Optional dependency (allows unauthenticated access)
async def get_current_user_optional(credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))) -> Optional[Dict[str, Any]]:
    """FastAPI dependency to optionally get current user from JWT token"""
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None 