import httpx
from fastapi import HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from config import settings
from utils.log import get_logger

logger = get_logger("jira-integration")

class JiraTokenRequest(BaseModel):
    code: str

class JiraTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    scope: str

async def exchange_jira_token(request: JiraTokenRequest) -> JiraTokenResponse:
    """Exchange Jira OAuth authorization code for access token"""
    logger.info("🔄 Received Jira token exchange request")
    logger.info(f"🔧 Authorization code length: {len(request.code)}")
    
    try:
        jira_client_id = settings.JIRA_CLIENT_ID
        jira_client_secret = settings.JIRA_CLIENT_SECRET
        
        logger.info(f"🔧 Jira Client ID: {jira_client_id}")
        logger.info(f"🔧 Jira Client Secret configured: {'Yes' if jira_client_secret else 'No'}")
        
        if not jira_client_id or not jira_client_secret:
            logger.error("❌ Jira credentials not configured")
            raise HTTPException(
                status_code=500, 
                detail="Jira credentials not configured"
            )
        
        logger.info("📡 Making request to Jira token endpoint...")
        # Exchange code for access token with Jira (Atlassian)
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://auth.atlassian.com/oauth/token",
                data={
                    "grant_type": "authorization_code",
                    "client_id": jira_client_id,
                    "client_secret": jira_client_secret,
                    "code": request.code,
                    "redirect_uri": f"{settings.BASE_URL}/api/jira/callback"
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
        logger.info(f"📡 Jira response status: {response.status_code}")
        logger.info(f"📡 Jira response body: {response.text}")
        
        if response.status_code != 200:
            error_msg = f"Jira API error: {response.status_code}"
            try:
                error_data = response.json()
                if "error_description" in error_data:
                    error_msg = error_data["error_description"]
                elif "error" in error_data:
                    error_msg = error_data["error"]
            except:
                pass
            
            logger.error(f"❌ Jira API error: {error_msg}")
            raise HTTPException(status_code=400, detail=error_msg)
            
        token_data = response.json()
        logger.info(f"📄 Jira response data keys: {list(token_data.keys())}")
        
        # Check for Jira API errors
        if "error" in token_data:
            error_msg = token_data.get("error_description", token_data["error"])
            logger.error(f"❌ Jira OAuth error: {error_msg}")
            raise HTTPException(status_code=400, detail=f"Jira OAuth error: {error_msg}")
        
        if "access_token" not in token_data:
            logger.error("❌ No access token in Jira response")
            raise HTTPException(status_code=400, detail="No access token received from Jira")
            
        logger.info("✅ Jira token exchange successful")
        return JiraTokenResponse(
            access_token=token_data["access_token"],
            refresh_token=token_data.get("refresh_token", ""),
            token_type=token_data.get("token_type", "bearer"),
            scope=token_data.get("scope", "")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error in Jira token exchange: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

async def jira_oauth_callback(code: str = None, error: str = None) -> HTMLResponse:
    """Jira OAuth callback endpoint"""
    logger.info("🔄 Jira OAuth callback received")
    logger.info(f"🔧 Code present: {'Yes' if code else 'No'}")
    logger.info(f"🔧 Error present: {'Yes' if error else 'No'}")
    
    if error:
        logger.error(f"❌ Jira OAuth callback error: {error}")
        return HTMLResponse(f"""
        <html>
            <head><title>Jira Auth Error</title></head>
            <body>
                <script>
                    console.log('❌ Jira OAuth error: {error}');
                    window.location.href = '/auth/jira/success?error=' + encodeURIComponent('{error}');
                </script>
            </body>
        </html>
        """)
    
    if code:
        logger.info(f"✅ Jira OAuth callback successful, redirecting with code")
        return HTMLResponse(f"""
        <html>
            <head><title>Jira Auth Success</title></head>
            <body>
                <script>
                    console.log('✅ Jira OAuth code received, redirecting...');
                    window.location.href = '/auth/jira/success?code=' + encodeURIComponent('{code}');
                </script>
            </body>
        </html>
        """)
    
    logger.error("❌ Jira OAuth callback missing code and error")
    raise HTTPException(status_code=400, detail="Missing authorization code or error")

async def jira_auth_success(code: str = None, error: str = None) -> HTMLResponse:
    """Jira OAuth success page"""
    logger.info("🎯 Jira auth success page accessed")
    logger.info(f"🔧 Code present: {'Yes' if code else 'No'}")
    logger.info(f"🔧 Error present: {'Yes' if error else 'No'}")
    
    if error:
        logger.error(f"❌ Jira auth failed: {error}")
        return HTMLResponse(f"""
        <html>
            <head><title>DesignX - Jira Auth Failed</title></head>
            <body>
                <h1>Jira Authentication Failed</h1>
                <p>Error: {error}</p>
                <script>
                    // Send error message to extension
                    if (window.opener) {{
                        window.opener.postMessage({{
                            type: 'JIRA_AUTH_ERROR',
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
        logger.info("✅ Jira auth successful, sending success message")
        return HTMLResponse(f"""
        <html>
            <head><title>DesignX - Jira Auth Success</title></head>
            <body>
                <h1>Jira Connected Successfully!</h1>
                <p>You can now close this window and return to the extension.</p>
                <script>
                    // Send success message to extension
                    if (window.opener) {{
                        window.opener.postMessage({{
                            type: 'JIRA_AUTH_SUCCESS',
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
    
    logger.error("❌ Jira auth success page accessed without code or error")
    raise HTTPException(status_code=400, detail="Missing authorization code") 