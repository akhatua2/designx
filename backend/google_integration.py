import httpx
from fastapi import HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Dict, Any
from config import settings
from auth_service import AuthService
import logging

logger = logging.getLogger(__name__)

class GoogleTokenRequest(BaseModel):
    code: str  # Google authorization code from frontend

class GoogleTokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]

async def exchange_google_token(request: GoogleTokenRequest) -> GoogleTokenResponse:
    """
    Exchange Google authorization code for our JWT token and user info
    """
    logger.info("🔄 Received Google authorization code exchange request")
    
    try:
        # Exchange authorization code for Google ID token
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": request.code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                    "grant_type": "authorization_code"
                }
            )
            
            if not token_response.is_success:
                logger.error(f"❌ Failed to exchange code for token: {token_response.text}")
                raise HTTPException(status_code=400, detail="Failed to exchange authorization code")
            
            token_data = token_response.json()
            id_token = token_data.get("id_token")
            
            if not id_token:
                logger.error("❌ No ID token received from Google")
                raise HTTPException(status_code=400, detail="No ID token received from Google")
        
        # Verify Google ID token and get user info
        user_info = AuthService.verify_google_token(id_token)
        
        # Create or update user in database
        user_data = AuthService.create_or_update_user(user_info)
        
        # Generate JWT token
        jwt_token = AuthService.generate_jwt_token(user_data)
        
        auth_result = {
            'user': user_data,
            'token': jwt_token,
            'token_type': 'bearer'
        }
        
        logger.info("✅ Google authorization code exchange successful")
        return GoogleTokenResponse(
            access_token=auth_result['token'],
            token_type=auth_result['token_type'],
            user=auth_result['user']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error in Google code exchange: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

async def google_oauth_callback(code: str = None, error: str = None) -> HTMLResponse:
    """
    Google OAuth callback endpoint - redirects to success page with parameters
    """
    logger.info("🔄 Google OAuth callback received")
    logger.info(f"🔧 Code present: {'Yes' if code else 'No'}")
    logger.info(f"🔧 Error present: {'Yes' if error else 'No'}")
    
    if error:
        logger.error(f"❌ Google OAuth callback error: {error}")
        return HTMLResponse(f"""
        <html>
            <head><title>Google Auth Error</title></head>
            <body>
                <script>
                    console.log('❌ OAuth error: {error}');
                    window.location.href = '/auth/google/success?error=' + encodeURIComponent('{error}');
                </script>
            </body>
        </html>
        """)
    
    if code:
        logger.info(f"✅ Google OAuth callback successful, redirecting with code")
        return HTMLResponse(f"""
        <html>
            <head><title>Google Auth Success</title></head>
            <body>
                <script>
                    console.log('✅ OAuth code received, redirecting...');
                    window.location.href = '/auth/google/success?code=' + encodeURIComponent('{code}');
                </script>
            </body>
        </html>
        """)
    
    logger.error("❌ Google OAuth callback missing code and error")
    raise HTTPException(status_code=400, detail="Missing authorization code or error")

async def google_auth_success(code: str = None, error: str = None) -> HTMLResponse:
    """
    Success page that the extension can detect
    """
    logger.info("🎯 Google auth success page accessed")
    logger.info(f"🔧 Code present: {'Yes' if code else 'No'}")
    logger.info(f"🔧 Error present: {'Yes' if error else 'No'}")
    
    if error:
        logger.error(f"❌ Auth success page with error: {error}")
        return HTMLResponse(f"""
        <html>
            <head>
                <title>Google Authentication Error</title>
                <style>
                    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; 
                           padding: 40px; text-align: center; background: #f5f5f5; }}
                    .error {{ color: #d73a49; background: white; padding: 20px; border-radius: 8px; 
                             box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
                </style>
            </head>
            <body>
                <div class="error">
                    <h2>Authentication Failed</h2>
                    <p>Error: {error}</p>
                    <p>You can close this window and try again.</p>
                </div>
                <script>
                    console.log('❌ Auth failed with error: {error}');
                    
                    // Send error message to parent window
                    if (window.opener) {{
                        window.opener.postMessage({{
                            type: 'GOOGLE_AUTH_ERROR',
                            error: '{error}'
                        }}, '*');
                        console.log('📨 Error message sent to parent window');
                    }} else {{
                        console.log('⚠️ No parent window found to send message to');
                    }}
                    
                    // Close window after sending message
                    setTimeout(() => {{ 
                        window.close(); 
                    }}, 2000);
                </script>
            </body>
        </html>
        """)
    
    if code:
        logger.info(f"✅ Auth success page with code, sending message to parent window")
        return HTMLResponse(f"""
        <html>
            <head>
                <title>Google Authentication Success</title>
                <style>
                    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; 
                           padding: 40px; text-align: center; background: #f5f5f5; }}
                    .success {{ color: #28a745; background: white; padding: 20px; border-radius: 8px; 
                               box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
                </style>
            </head>
            <body>
                <div class="success">
                    <h2>✅ Authentication Successful!</h2>
                    <p>Google authentication completed successfully.</p>
                    <p>This window will close automatically...</p>
                </div>
                <script>
                    console.log('✅ Auth successful, sending message to parent window...');
                    
                    // Send success message to parent window
                    if (window.opener) {{
                        window.opener.postMessage({{
                            type: 'GOOGLE_AUTH_SUCCESS',
                            code: '{code}'
                        }}, '*');
                        console.log('📨 Success message sent to parent window');
                    }} else {{
                        console.log('⚠️ No parent window found to send message to');
                    }}
                    
                    // Close window after sending message
                    setTimeout(() => {{ 
                        window.close(); 
                    }}, 1000);
                </script>
            </body>
        </html>
        """)
    
    logger.error("❌ Auth success page accessed without code or error")
    raise HTTPException(status_code=400, detail="Missing authorization code")

async def get_google_user(authorization: str) -> Dict[str, Any]:
    """
    Get user info using our JWT token (not Google's token)
    """
    try:
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization header")
        
        token = authorization.replace("Bearer ", "")
        
        # Verify our JWT token and get user from Supabase
        payload = AuthService.verify_jwt_token(token)
        user = AuthService.get_user_by_id(payload['user_id'])
        
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
            
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}") 