from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, Response
import httpx
from pydantic import BaseModel
from config import settings
import os
import logging

# Configure logging for Cloud Run
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="DesignX Extension API",
    description="Backend API for DesignX browser extension",
    version="1.0.0"
)

# Enable CORS for your extension and localhost
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
    expose_headers=settings.CORS_EXPOSE_HEADERS,
)

class TokenRequest(BaseModel):
    code: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

# Add Slack token request/response models
class SlackTokenRequest(BaseModel):
    code: str

class SlackTokenResponse(BaseModel):
    access_token: str
    team: dict
    authed_user: dict

# Add Jira token request/response models
class JiraTokenRequest(BaseModel):
    code: str

class JiraTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    scope: str

class RunSWEAgentRequest(BaseModel):
    repo_url: str
    issue_url: str
    github_token: str

@app.get("/favicon.ico")
async def favicon():
    """
    Return a simple favicon to prevent 404 errors
    """
    # Simple 16x16 transparent PNG favicon as base64
    favicon_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x10\x00\x00\x00\x10\x08\x06\x00\x00\x00\x1f\xf3\xffa\x00\x00\x00\x19tEXtSoftware\x00Adobe ImageReadyq\xc9e<\x00\x00\x00\x0eIDATx\xdab\x00\x02\x00\x00\x05\x00\x01\r\n-\xdb\x00\x00\x00\x00IEND\xaeB`\x82'
    return Response(content=favicon_data, media_type="image/png")

@app.get("/")
async def root():
    return {"message": "DesignX Extension API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "designx-api"}

@app.post("/api/github/exchange", response_model=TokenResponse)
async def exchange_github_token(request: TokenRequest):
    """
    Exchange GitHub OAuth authorization code for access token
    """
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

@app.get("/api/github/callback", response_class=HTMLResponse)
async def github_oauth_callback(code: str = None, error: str = None):
    """
    GitHub OAuth callback endpoint - redirects to success page with parameters
    """
    logger.info("🔄 OAuth callback received")
    logger.info(f"🔧 Code present: {'Yes' if code else 'No'}")
    logger.info(f"🔧 Error present: {'Yes' if error else 'No'}")
    
    if error:
        logger.error(f"❌ OAuth callback error: {error}")
        return f"""
        <html>
            <head><title>GitHub Auth Error</title></head>
            <body>
                <script>
                    console.log('❌ OAuth error: {error}');
                    window.location.href = '/auth/github/success?error=' + encodeURIComponent('{error}');
                </script>
            </body>
        </html>
        """
    
    if code:
        logger.info(f"✅ OAuth callback successful, redirecting with code")
        return f"""
        <html>
            <head><title>GitHub Auth Success</title></head>
            <body>
                <script>
                    console.log('✅ OAuth code received, redirecting...');
                    window.location.href = '/auth/github/success?code=' + encodeURIComponent('{code}');
                </script>
            </body>
        </html>
        """
    
    logger.error("❌ OAuth callback missing code and error")
    raise HTTPException(status_code=400, detail="Missing authorization code or error")

@app.get("/auth/github/success", response_class=HTMLResponse)
async def github_auth_success(code: str = None, error: str = None):
    """
    Success page that the extension can detect
    """
    logger.info("🎯 GitHub auth success page accessed")
    logger.info(f"🔧 Code present: {'Yes' if code else 'No'}")
    logger.info(f"🔧 Error present: {'Yes' if error else 'No'}")
    
    if error:
        logger.error(f"❌ Auth success page with error: {error}")
        return f"""
        <html>
            <head>
                <title>GitHub Authentication Error</title>
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
                            type: 'GITHUB_AUTH_ERROR',
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
        """
    
    if code:
        logger.info(f"✅ Auth success page with code, sending message to parent window")
        return f"""
        <html>
            <head>
                <title>GitHub Authentication Success</title>
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
                    <p>GitHub authentication completed successfully.</p>
                    <p>This window will close automatically...</p>
                </div>
                <script>
                    console.log('✅ Auth successful, sending message to parent window...');
                    
                    // Send success message to parent window
                    if (window.opener) {{
                        window.opener.postMessage({{
                            type: 'GITHUB_AUTH_SUCCESS',
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
        """
    
    logger.error("❌ Auth success page accessed without code or error")
    raise HTTPException(status_code=400, detail="Missing authorization code")

@app.get("/api/github/user")
async def get_github_user(authorization: str):
    """
    Get GitHub user info (for verification)
    """
    try:
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization header")
        
        token = authorization.replace("Bearer ", "")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.github.com/user",
                headers={"Authorization": f"token {token}"}
            )
            
        if response.status_code == 401:
            raise HTTPException(status_code=401, detail="Invalid GitHub token")
        elif response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch user data")
            
        return response.json()
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/api/slack/exchange", response_model=SlackTokenResponse)
async def exchange_slack_token(request: SlackTokenRequest):
    """
    Exchange Slack OAuth authorization code for access token
    """
    logger.info("🔄 Received Slack token exchange request")
    logger.info(f"🔧 Authorization code length: {len(request.code)}")
    
    try:
        slack_client_id = settings.SLACK_CLIENT_ID
        slack_client_secret = settings.SLACK_CLIENT_SECRET
        slack_redirect_uri = settings.SLACK_REDIRECT_URI
        
        logger.info(f"🔧 Slack Client ID: {slack_client_id}")
        logger.info(f"🔧 Slack Client Secret configured: {'Yes' if slack_client_secret else 'No'}")
        logger.info(f"🔧 Slack Redirect URI: {slack_redirect_uri}")
        
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
                    "redirect_uri": slack_redirect_uri
                }
            )
            
        logger.info(f"📡 Slack response status: {response.status_code}")
        logger.info(f"📡 Slack response body: {response.text}")
        
        if response.status_code != 200:
            error_msg = f"Slack API error: {response.status_code}"
            try:
                error_data = response.json()
                if "error" in error_data:
                    error_msg = error_data["error"]
            except:
                pass
            
            logger.error(f"❌ Slack API error: {error_msg}")
            raise HTTPException(status_code=400, detail=error_msg)
            
        token_data = response.json()
        logger.info(f"📄 Slack response data keys: {list(token_data.keys())}")
        
        # Check for Slack API errors
        if not token_data.get("ok"):
            error_msg = token_data.get("error", "Unknown error")
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

@app.get("/api/slack/callback", response_class=HTMLResponse)
async def slack_oauth_callback(code: str = None, error: str = None):
    """
    Slack OAuth callback endpoint - redirects to success page with parameters
    """
    logger.info("🔄 Slack OAuth callback received")
    logger.info(f"🔧 Code present: {'Yes' if code else 'No'}")
    logger.info(f"🔧 Error present: {'Yes' if error else 'No'}")
    
    if error:
        logger.error(f"❌ Slack OAuth callback error: {error}")
        return f"""
        <html>
            <head><title>Slack Auth Error</title></head>
            <body>
                <script>
                    console.log('❌ OAuth error: {error}');
                    window.location.href = '/auth/slack/success?error=' + encodeURIComponent('{error}');
                </script>
            </body>
        </html>
        """
    
    if code:
        logger.info(f"✅ Slack OAuth callback successful, redirecting with code")
        return f"""
        <html>
            <head><title>Slack Auth Success</title></head>
            <body>
                <script>
                    console.log('✅ OAuth code received, redirecting...');
                    window.location.href = '/auth/slack/success?code=' + encodeURIComponent('{code}');
                </script>
            </body>
        </html>
        """
    
    logger.error("❌ Slack OAuth callback missing code and error")
    raise HTTPException(status_code=400, detail="Missing authorization code or error")

@app.get("/auth/slack/success", response_class=HTMLResponse)
async def slack_auth_success(code: str = None, error: str = None):
    """
    Success page that the extension can detect
    """
    logger.info("🎯 Slack auth success page accessed")
    logger.info(f"🔧 Code present: {'Yes' if code else 'No'}")
    logger.info(f"🔧 Error present: {'Yes' if error else 'No'}")
    
    if error:
        logger.error(f"❌ Auth success page with error: {error}")
        return f"""
        <html>
            <head>
                <title>Slack Authentication Error</title>
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
                            type: 'SLACK_AUTH_ERROR',
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
        """
    
    if code:
        logger.info(f"✅ Auth success page with code, sending message to parent window")
        return f"""
        <html>
            <head>
                <title>Slack Authentication Success</title>
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
                    <p>Slack authentication completed successfully.</p>
                    <p>This window will close automatically...</p>
                </div>
                <script>
                    console.log('✅ Auth successful, sending message to parent window...');
                    
                    // Send success message to parent window
                    if (window.opener) {{
                        window.opener.postMessage({{
                            type: 'SLACK_AUTH_SUCCESS',
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
        """
    
    logger.error("❌ Auth success page accessed without code or error")
    raise HTTPException(status_code=400, detail="Missing authorization code")

@app.post("/api/jira/exchange", response_model=JiraTokenResponse)
async def exchange_jira_token(request: JiraTokenRequest):
    """
    Exchange Jira OAuth authorization code for access token
    """
    logger.info("🔄 Received Jira token exchange request")
    logger.info(f"🔧 Authorization code length: {len(request.code)}")
    
    try:
        jira_client_id = settings.JIRA_CLIENT_ID if hasattr(settings, 'JIRA_CLIENT_ID') else None
        jira_client_secret = settings.JIRA_CLIENT_SECRET if hasattr(settings, 'JIRA_CLIENT_SECRET') else None
        jira_redirect_uri = settings.JIRA_REDIRECT_URI if hasattr(settings, 'JIRA_REDIRECT_URI') else None
        
        logger.info(f"🔧 Jira Client ID: {jira_client_id}")
        logger.info(f"🔧 Jira Client Secret configured: {'Yes' if jira_client_secret else 'No'}")
        logger.info(f"🔧 Jira Redirect URI: {jira_redirect_uri}")
        
        if not jira_client_id or not jira_client_secret:
            logger.error("❌ Jira credentials not configured")
            raise HTTPException(
                status_code=500, 
                detail="Jira credentials not configured"
            )
        
        logger.info("📡 Making request to Jira token endpoint...")
        # Exchange code for access token with Jira
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://auth.atlassian.com/oauth/token",
                data={
                    "grant_type": "authorization_code",
                    "client_id": jira_client_id,
                    "client_secret": jira_client_secret,
                    "code": request.code,
                    "redirect_uri": jira_redirect_uri
                },
                headers={
                    "Content-Type": "application/x-www-form-urlencoded"
                }
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
            token_type="bearer",
            scope=token_data.get("scope", "")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error in Jira token exchange: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/api/jira/callback", response_class=HTMLResponse)
async def jira_oauth_callback(code: str = None, error: str = None):
    """
    Jira OAuth callback endpoint - redirects to success page with parameters
    """
    logger.info("🔄 Jira OAuth callback received")
    logger.info(f"🔧 Code present: {'Yes' if code else 'No'}")
    logger.info(f"🔧 Error present: {'Yes' if error else 'No'}")
    
    if error:
        logger.error(f"❌ Jira OAuth callback error: {error}")
        return f"""
        <html>
            <head><title>Jira Auth Error</title></head>
            <body>
                <script>
                    console.log('❌ OAuth error: {error}');
                    window.location.href = '/auth/jira/success?error=' + encodeURIComponent('{error}');
                </script>
            </body>
        </html>
        """
    
    if code:
        logger.info(f"✅ Jira OAuth callback successful, redirecting with code")
        return f"""
        <html>
            <head><title>Jira Auth Success</title></head>
            <body>
                <script>
                    console.log('✅ OAuth code received, redirecting...');
                    window.location.href = '/auth/jira/success?code=' + encodeURIComponent('{code}');
                </script>
            </body>
        </html>
        """
    
    logger.error("❌ Jira OAuth callback missing code and error")
    raise HTTPException(status_code=400, detail="Missing authorization code or error")

@app.get("/auth/jira/success", response_class=HTMLResponse)
async def jira_auth_success(code: str = None, error: str = None):
    """
    Success page that the extension can detect
    """
    logger.info("🎯 Jira auth success page accessed")
    logger.info(f"🔧 Code present: {'Yes' if code else 'No'}")
    logger.info(f"🔧 Error present: {'Yes' if error else 'No'}")
    
    if error:
        logger.error(f"❌ Auth success page with error: {error}")
        return f"""
        <html>
            <head>
                <title>Jira Authentication Error</title>
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
                            type: 'JIRA_AUTH_ERROR',
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
        """
    
    if code:
        logger.info(f"✅ Auth success page with code, sending message to parent window")
        return f"""
        <html>
            <head>
                <title>Jira Authentication Success</title>
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
                    <p>Jira authentication completed successfully.</p>
                    <p>This window will close automatically...</p>
                </div>
                <script>
                    console.log('✅ Auth successful, sending message to parent window...');
                    
                    // Send success message to parent window
                    if (window.opener) {{
                        window.opener.postMessage({{
                            type: 'JIRA_AUTH_SUCCESS',
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
        """
    
    logger.error("❌ Auth success page accessed without code or error")
    raise HTTPException(status_code=400, detail="Missing authorization code")

@app.post("/api/run-sweagent")
async def run_sweagent(request: RunSWEAgentRequest):
    """
    Run SWE-agent using direct imports instead of subprocess
    """
    try:
        logger.info("🚀 SWE-agent trigger requested:")
        logger.info(f"   Repository: {request.repo_url}")
        logger.info(f"   Issue: {request.issue_url}")
        logger.info(f"   GitHub token provided: {'Yes' if request.github_token else 'No'}")
        logger.info(f"   OpenAI API key configured: {'Yes' if settings.OPENAI_API_KEY else 'No'}")
        
        # Set up environment variables
        env = os.environ.copy()
        env.update({
            "GITHUB_TOKEN": request.github_token,
            "OPENAI_API_KEY": settings.OPENAI_API_KEY,
        })
        
        # Update environment variables for the current process
        os.environ["GITHUB_TOKEN"] = request.github_token
        os.environ["OPENAI_API_KEY"] = settings.OPENAI_API_KEY
        
        # Add Modal credentials for deployment
        if hasattr(settings, 'MODAL_TOKEN_ID') and settings.MODAL_TOKEN_ID:
            os.environ["MODAL_TOKEN_ID"] = settings.MODAL_TOKEN_ID
        if hasattr(settings, 'MODAL_TOKEN_SECRET') and settings.MODAL_TOKEN_SECRET:
            os.environ["MODAL_TOKEN_SECRET"] = settings.MODAL_TOKEN_SECRET
        
        logger.info("🔧 Environment variables updated")
        
        # Import SWE-agent modules
        try:
            # Add SWE-agent to path (it's now in the same directory)
            import sys
            sys.path.insert(0, '/app/SWE-agent')
            
            from sweagent.run.run_single import RunSingleConfig, run_from_config
            from sweagent.environment.swe_env import EnvironmentConfig
            from sweagent.agent.agents import DefaultAgentConfig
            from sweagent.agent.problem_statement import GithubIssue
            from sweagent.agent.models import GenericAPIModelConfig
            from pathlib import Path
            logger.info("✅ SWE-agent modules imported successfully")
        except ImportError as e:
            logger.error(f"❌ Failed to import SWE-agent modules: {str(e)}")
            return {
                "status": "error",
                "message": f"Failed to import SWE-agent modules: {str(e)}"
            }
        
        # Create the configuration
        try:
            logger.info("🔧 Creating SWE-agent configuration...")
            
            # Create model config
            model_config = GenericAPIModelConfig(
                name="gpt-4.1",
                per_instance_cost_limit=1.00
            )
            
            # Create agent config
            agent_config = DefaultAgentConfig(model=model_config)
            
            # Create environment config
            env_config = EnvironmentConfig()
            env_config.repo.github_url = request.repo_url
            # Configure for Modal deployment
            env_config.deployment.type = "modal"
            
            # Create problem statement config
            problem_statement_config = GithubIssue(github_url=request.issue_url)
            
            # Create the main config
            config = RunSingleConfig(
                agent=agent_config,
                env=env_config,
                problem_statement=problem_statement_config,
                output_dir=Path("/app/trajectories")
            )
            
            logger.info("✅ Configuration created successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to create configuration: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                "status": "error",
                "message": f"Failed to create configuration: {str(e)}"
            }
        
        # Run SWE-agent in a background thread
        import threading
        import asyncio
        
        def run_sweagent_task():
            try:
                logger.info("🚀 Starting SWE-agent run...")
                run_from_config(config)
                logger.info("✅ SWE-agent completed successfully")
            except Exception as e:
                logger.error(f"❌ SWE-agent run failed: {str(e)}")
                import traceback
                traceback.print_exc()
        
        # Start the task in a background thread
        thread = threading.Thread(target=run_sweagent_task, daemon=True)
        thread.start()
        
        return {
            "status": "triggered", 
            "message": "SWE-agent started successfully using direct imports",
            "repo_url": request.repo_url,
            "issue_url": request.issue_url,
            "execution_method": "direct_import"
        }
        
    except Exception as e:
        logger.error(f"❌ Error in SWE-agent trigger: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return {
            "status": "error",
            "message": f"Failed to trigger SWE-agent: {str(e)}",
            "error_type": type(e).__name__
        }

if __name__ == "__main__":
    import uvicorn
    
    # Get port from environment variable for Cloud Run
    port = int(os.getenv("PORT", "8000"))
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",  # Required for Cloud Run
        port=port,
        log_level="info",
        proxy_headers=True,  # Required for Cloud Run HTTPS
        forwarded_allow_ips="*"  # Required for Cloud Run
    ) 