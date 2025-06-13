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
    """Run SWE-agent on a GitHub issue using CLI command"""
    logger.info(f"🚀 Starting SWE-agent run for {request.repo_url}")
    
    try:
        # Set environment variables
        env = os.environ.copy()
        env["GITHUB_TOKEN"] = request.github_token
        
        # Add OpenAI API key
        if hasattr(settings, 'OPENAI_API_KEY') and settings.OPENAI_API_KEY:
            env["OPENAI_API_KEY"] = settings.OPENAI_API_KEY
            logger.info(f"🔑 OpenAI API key set: {settings.OPENAI_API_KEY[:10]}...")
        else:
            logger.warning("⚠️ No OpenAI API key found in settings")
        
        # Add Modal credentials for deployment
        if hasattr(settings, 'MODAL_TOKEN_ID') and settings.MODAL_TOKEN_ID:
            env["MODAL_TOKEN_ID"] = settings.MODAL_TOKEN_ID
            logger.info(f"🔑 Modal Token ID set: {settings.MODAL_TOKEN_ID[:10]}...")
        else:
            logger.warning("⚠️ No Modal Token ID found in settings")
            
        if hasattr(settings, 'MODAL_TOKEN_SECRET') and settings.MODAL_TOKEN_SECRET:
            env["MODAL_TOKEN_SECRET"] = settings.MODAL_TOKEN_SECRET
            logger.info(f"🔑 Modal Token Secret set: {settings.MODAL_TOKEN_SECRET[:10]}...")
        else:
            logger.warning("⚠️ No Modal Token Secret found in settings")
        
        # Check if running in Docker vs local and find the correct SWE-agent path
        possible_paths = [
            '/app/SWE-agent',  # Docker
            'SWE-agent',  # Direct from backend directory
            'backend/SWE-agent',  # From parent directory
            os.path.join(os.path.dirname(__file__), 'SWE-agent')  # Relative to main.py
        ]
        
        swe_agent_path = None
        for path in possible_paths:
            if os.path.exists(path):
                swe_agent_path = path
                break
        
        if not swe_agent_path:
            raise Exception(f"SWE-agent directory not found. Tried: {possible_paths}")
        
        # Build the CLI command exactly as you specified from the docs
        cmd = [
            "sweagent", "run",
            "--agent.model.name=gpt-4.1", 
            "--config", "config/default.yaml",
            "--agent.model.per_instance_cost_limit=1.00",
            f"--env.repo.github_url={request.repo_url}",
            f"--problem_statement.github_url={request.issue_url}",
            "--env.deployment.type=modal"
        ]
        
        logger.info(f"🤖 Running SWE-agent from {swe_agent_path}")
        logger.info(f"🤖 Command: {' '.join(cmd)}")
        
        # Run the command from SWE-agent root directory  
        import subprocess
        import time
        import asyncio
        import threading
        
        logger.info("🚀 Starting SWE-agent...")
        process = subprocess.Popen(
            cmd,
            cwd=swe_agent_path,  # This is critical - run from SWE-agent root
            env=env,  # Use our custom environment with all the tokens
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,  # Merge stderr into stdout
            text=True,
            bufsize=1,  # Line buffered
            universal_newlines=True
        )
        
        # Start background thread to stream output to logs
        def stream_output():
            try:
                while True:
                    line = process.stdout.readline()
                    if not line:
                        if process.poll() is not None:
                            break
                        time.sleep(0.1)
                        continue
                    
                    # Log each line from SWE-agent with a prefix
                    line = line.strip()
                    if line:
                        logger.info(f"🤖 SWE-agent: {line}")
                
                # Log final status
                process.wait()
                if process.returncode == 0:
                    logger.info(f"✅ SWE-agent completed successfully (exit code: {process.returncode})")
                else:
                    logger.error(f"❌ SWE-agent failed (exit code: {process.returncode})")
                    
            except Exception as e:
                logger.error(f"❌ Error streaming SWE-agent output: {e}")
        
        # Start the streaming thread
        stream_thread = threading.Thread(target=stream_output, daemon=True)
        stream_thread.start()
        
        # Wait a moment to check if it starts properly
        time.sleep(5)
        
        if process.poll() is not None:
            # Process has already terminated
            logger.error(f"❌ SWE-agent terminated early (exit code: {process.returncode})")
            return {"status": "error", "message": f"SWE-agent terminated early (exit code {process.returncode})"}
        
        # Process is still running after 5 seconds, it's probably working
        logger.info(f"✅ SWE-agent confirmed running with PID: {process.pid}")
        logger.info(f"📡 Streaming output to logs - check Cloud Run logs for real-time progress")
        return {"status": "started", "message": f"SWE-agent started successfully with PID {process.pid} - streaming to logs", "pid": process.pid}
        
        # Note: Commented out the wait logic since SWE-agent runs for a long time
        # result = process.communicate(timeout=3600)
        # if process.returncode == 0:
        #     return {"status": "success", "message": "SWE-agent completed successfully"}
        # else:
        #     return {"status": "error", "message": f"SWE-agent failed: {result[1]}"}

    except Exception as e:
        logger.error(f"❌ Error running SWE-agent: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": f"Failed to run SWE-agent: {str(e)}"}


def run_sweagent_direct(repo_url: str, issue_url: str, github_token: str) -> dict:
    """
    Direct function to run SWE-agent without FastAPI overhead.
    
    Args:
        repo_url: GitHub repository URL (e.g., "https://github.com/owner/repo")
        issue_url: GitHub issue URL (e.g., "https://github.com/owner/repo/issues/1")
        github_token: GitHub personal access token
        
    Returns:
        dict: Status and message indicating success or failure
        
    Example:
        result = run_sweagent_direct(
            repo_url="https://github.com/akhatua2/wikifix",
            issue_url="https://github.com/akhatua2/wikifix/issues/5",
            github_token="ghp_xxxxxxxxxxxx"
        )
        print(result)
    """
    # Create request object
    request = RunSWEAgentRequest(
        repo_url=repo_url,
        issue_url=issue_url,
        github_token=github_token
    )
    
    # Call the async function synchronously
    import asyncio
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    return loop.run_until_complete(run_sweagent(request))


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