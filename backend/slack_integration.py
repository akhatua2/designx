import httpx
from fastapi import HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from config import settings
from utils.log import get_logger

logger = get_logger("slack-integration")

class SlackTokenRequest(BaseModel):
    code: str

class SlackTokenResponse(BaseModel):
    access_token: str
    team: dict
    authed_user: dict

async def exchange_slack_token(request: SlackTokenRequest) -> SlackTokenResponse:
    """Exchange Slack OAuth authorization code for access token"""
    logger.info("🔄 Received Slack token exchange request")
    logger.info(f"🔧 Authorization code length: {len(request.code)}")
    
    try:
        slack_client_id = settings.SLACK_CLIENT_ID
        slack_client_secret = settings.SLACK_CLIENT_SECRET
        
        logger.info(f"🔧 Slack Client ID: {slack_client_id}")
        logger.info(f"🔧 Slack Client Secret configured: {'Yes' if slack_client_secret else 'No'}")
        
        if not slack_client_id or not slack_client_secret:
            logger.error("❌ Slack credentials not configured")
            raise HTTPException(
                status_code=500, 
                detail="Slack credentials not configured"
            )
        
        logger.info("📡 Making request to Slack token endpoint...")
        # Exchange code for access token with Slack
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://slack.com/api/oauth.v2.access",
                data={
                    "client_id": slack_client_id,
                    "client_secret": slack_client_secret,
                    "code": request.code,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
        logger.info(f"📡 Slack response status: {response.status_code}")
        logger.info(f"📡 Slack response body: {response.text}")
        
        if response.status_code != 200:
            error_msg = f"Slack API error: {response.status_code}"
            logger.error(f"❌ Slack API error: {error_msg}")
            raise HTTPException(status_code=400, detail=error_msg)
            
        token_data = response.json()
        logger.info(f"📄 Slack response data keys: {list(token_data.keys())}")
        
        # Check for Slack API errors
        if not token_data.get("ok", False):
            error_msg = token_data.get("error", "Unknown Slack error")
            logger.error(f"❌ Slack OAuth error: {error_msg}")
            raise HTTPException(status_code=400, detail=f"Slack OAuth error: {error_msg}")
        
        if "access_token" not in token_data:
            logger.error("❌ No access token in Slack response")
            raise HTTPException(status_code=400, detail="No access token received from Slack")
            
        logger.info("✅ Slack token exchange successful")
        return SlackTokenResponse(
            access_token=token_data["access_token"],
            team=token_data.get("team", {}),
            authed_user=token_data.get("authed_user", {})
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error in Slack token exchange: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

async def slack_oauth_callback(code: str = None, error: str = None) -> HTMLResponse:
    """Slack OAuth callback endpoint"""
    logger.info("🔄 Slack OAuth callback received")
    logger.info(f"🔧 Code present: {'Yes' if code else 'No'}")
    logger.info(f"🔧 Error present: {'Yes' if error else 'No'}")
    
    if error:
        logger.error(f"❌ Slack OAuth callback error: {error}")
        return HTMLResponse(f"""
        <html>
            <head><title>Slack Auth Error</title></head>
            <body>
                <script>
                    console.log('❌ Slack OAuth error: {error}');
                    window.location.href = '/auth/slack/success?error=' + encodeURIComponent('{error}');
                </script>
            </body>
        </html>
        """)
    
    if code:
        logger.info(f"✅ Slack OAuth callback successful, redirecting with code")
        return HTMLResponse(f"""
        <html>
            <head><title>Slack Auth Success</title></head>
            <body>
                <script>
                    console.log('✅ Slack OAuth code received, redirecting...');
                    window.location.href = '/auth/slack/success?code=' + encodeURIComponent('{code}');
                </script>
            </body>
        </html>
        """)
    
    logger.error("❌ Slack OAuth callback missing code and error")
    raise HTTPException(status_code=400, detail="Missing authorization code or error")

async def slack_auth_success(code: str = None, error: str = None) -> HTMLResponse:
    """Slack OAuth success page"""
    logger.info("🎯 Slack auth success page accessed")
    logger.info(f"🔧 Code present: {'Yes' if code else 'No'}")
    logger.info(f"🔧 Error present: {'Yes' if error else 'No'}")
    
    if error:
        logger.error(f"❌ Slack auth failed: {error}")
        return HTMLResponse(f"""
        <html>
            <head><title>DesignX - Slack Auth Failed</title></head>
            <body>
                <h1>Slack Authentication Failed</h1>
                <p>Error: {error}</p>
                <script>
                    // Send error message to extension
                    if (window.opener) {{
                        window.opener.postMessage({{
                            type: 'SLACK_AUTH_ERROR',
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
        logger.info("✅ Slack auth successful, sending success message")
        return HTMLResponse(f"""
        <html>
            <head><title>DesignX - Slack Auth Success</title></head>
            <body>
                <h1>Slack Connected Successfully!</h1>
                <p>You can now close this window and return to the extension.</p>
                <script>
                    // Send success message to extension
                    if (window.opener) {{
                        window.opener.postMessage({{
                            type: 'SLACK_AUTH_SUCCESS',
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
    
    logger.error("❌ Slack auth success page accessed without code or error")
    raise HTTPException(status_code=400, detail="Missing authorization code") 