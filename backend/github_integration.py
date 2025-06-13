import httpx
from fastapi import HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from config import settings
from utils.log import get_logger

logger = get_logger("github-integration")

class TokenRequest(BaseModel):
    code: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

async def exchange_github_token(request: TokenRequest) -> TokenResponse:
    """Exchange GitHub OAuth authorization code for access token"""
    logger.info("🔄 Received token exchange request")
    logger.info(f"🔧 Authorization code length: {len(request.code)}")
    
    try:
        github_client_id = settings.GITHUB_CLIENT_ID
        github_client_secret = settings.GITHUB_CLIENT_SECRET
        
        logger.info(f"🔧 GitHub Client ID: {github_client_id}")
        logger.info(f"🔧 GitHub Client Secret configured: {'Yes' if github_client_secret else 'No'}")
        
        if not github_client_id or not github_client_secret:
            logger.error("❌ GitHub credentials not configured")
            raise HTTPException(
                status_code=500, 
                detail="GitHub credentials not configured"
            )
        
        logger.info("📡 Making request to GitHub token endpoint...")
        # Exchange code for access token with GitHub
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "client_id": github_client_id,
                    "client_secret": github_client_secret,
                    "code": request.code,
                },
                headers={"Accept": "application/json"}
            )
            
        logger.info(f"📡 GitHub response status: {response.status_code}")
        logger.info(f"📡 GitHub response body: {response.text}")
        
        if response.status_code != 200:
            error_msg = f"GitHub API error: {response.status_code}"
            try:
                error_data = response.json()
                if "error_description" in error_data:
                    error_msg = error_data["error_description"]
                elif "error" in error_data:
                    error_msg = error_data["error"]
            except:
                pass
            
            logger.error(f"❌ GitHub API error: {error_msg}")
            raise HTTPException(status_code=400, detail=error_msg)
            
        token_data = response.json()
        logger.info(f"📄 GitHub response data keys: {list(token_data.keys())}")
        
        # Check for GitHub API errors
        if "error" in token_data:
            error_msg = token_data.get("error_description", token_data["error"])
            logger.error(f"❌ GitHub OAuth error: {error_msg}")
            raise HTTPException(status_code=400, detail=f"GitHub OAuth error: {error_msg}")
        
        if "access_token" not in token_data:
            logger.error("❌ No access token in GitHub response")
            raise HTTPException(status_code=400, detail="No access token received from GitHub")
            
        logger.info("✅ Token exchange successful")
        return TokenResponse(
            access_token=token_data["access_token"],
            token_type="bearer"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error in token exchange: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

async def github_oauth_callback(code: str = None, error: str = None) -> HTMLResponse:
    """GitHub OAuth callback endpoint - redirects to success page with parameters"""
    logger.info("🔄 OAuth callback received")
    logger.info(f"🔧 Code present: {'Yes' if code else 'No'}")
    logger.info(f"🔧 Error present: {'Yes' if error else 'No'}")
    
    if error:
        logger.error(f"❌ OAuth callback error: {error}")
        return HTMLResponse(f"""
        <html>
            <head><title>GitHub Auth Error</title></head>
            <body>
                <script>
                    console.log('❌ OAuth error: {error}');
                    window.location.href = '/auth/github/success?error=' + encodeURIComponent('{error}');
                </script>
            </body>
        </html>
        """)
    
    if code:
        logger.info(f"✅ OAuth callback successful, redirecting with code")
        return HTMLResponse(f"""
        <html>
            <head><title>GitHub Auth Success</title></head>
            <body>
                <script>
                    console.log('✅ OAuth code received, redirecting...');
                    window.location.href = '/auth/github/success?code=' + encodeURIComponent('{code}');
                </script>
            </body>
        </html>
        """)
    
    logger.error("❌ OAuth callback missing code and error")
    raise HTTPException(status_code=400, detail="Missing authorization code or error")

async def github_auth_success(code: str = None, error: str = None) -> HTMLResponse:
    """GitHub OAuth success page that sends message to extension"""
    logger.info("🎯 Auth success page accessed")
    logger.info(f"🔧 Code present: {'Yes' if code else 'No'}")
    logger.info(f"🔧 Error present: {'Yes' if error else 'No'}")
    
    if error:
        logger.error(f"❌ Auth failed: {error}")
        return HTMLResponse(f"""
        <html>
            <head><title>DesignX - GitHub Auth Failed</title></head>
            <body>
                <h1>Authentication Failed</h1>
                <p>Error: {error}</p>
                <script>
                    // Send error message to extension
                    if (window.opener) {{
                        window.opener.postMessage({{
                            type: 'GITHUB_AUTH_ERROR',
                            error: '{error}'
                        }}, '*');
                    }}
                    
                    // Close window after sending message
                    setTimeout(() => {{ 
                        window.close(); 
                    }}, 3000);
                </script>
            </body>
        </html>
        """)
    
    if code:
        logger.info("✅ Auth successful, sending success message")
        return HTMLResponse(f"""
        <html>
            <head><title>DesignX - GitHub Auth Success</title></head>
            <body>
                <h1>GitHub Connected Successfully!</h1>
                <p>You can now close this window and return to the extension.</p>
                <script>
                    // Send success message to extension
                    if (window.opener) {{
                        window.opener.postMessage({{
                            type: 'GITHUB_AUTH_SUCCESS',
                            code: '{code}'
                        }}, '*');
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

async def get_github_user(authorization: str) -> dict:
    """Get GitHub user information using access token"""
    logger.info("🔄 Fetching GitHub user information")
    
    try:
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=400, detail="Invalid authorization header format")
        
        token = authorization.replace("Bearer ", "")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.github.com/user",
                headers={"Authorization": f"token {token}"}
            )
        
        if response.status_code != 200:
            logger.error(f"❌ GitHub API error: {response.status_code}")
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch user data")
        
        user_data = response.json()
        logger.info(f"✅ Successfully fetched user data for: {user_data.get('login')}")
        
        return user_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching GitHub user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}") 