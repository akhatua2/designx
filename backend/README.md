# DesignX Extension Backend

FastAPI backend for the DesignX browser extension, providing secure GitHub OAuth token exchange.

## Setup

1. **Install Python dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Create environment file:**
   Create a `.env` file in the backend directory with:
   ```
   GITHUB_CLIENT_ID=your_github_client_id_here
   GITHUB_CLIENT_SECRET=your_github_client_secret_here
   PORT=8000
   HOST=0.0.0.0
   DEBUG=True
   ```

3. **Get GitHub OAuth credentials:**
   - Go to GitHub Settings > Developer settings > OAuth Apps
   - Create a new OAuth App with:
     - Application name: "DesignX Extension"
     - Homepage URL: `http://localhost:8000`
     - Authorization callback URL: `http://localhost:8000/api/github/callback`
   - Copy the Client ID and Client Secret to your `.env` file

4. **Ensure token permissions:**
   The OAuth token requested by the extension must include the `repo` scope so
   SWE-Agent can clone private repositories and open pull requests directly in
   your workspace. The default configuration already requests `repo` and
   `read:user` permissions.

5. **Run the server:**
   ```bash
   python main.py
   ```
   
   Or using uvicorn directly:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

## API Endpoints

- `GET /` - Root endpoint
- `GET /health` - Health check
- `POST /api/github/exchange` - Exchange OAuth code for access token
- `GET /api/github/user` - Get GitHub user info (requires Bearer token)

## Development

The server runs with auto-reload enabled during development. Any changes to the Python files will automatically restart the server.

## CORS Configuration

The API is configured to accept requests from:
- Chrome extension origins (`chrome-extension://*`)
- Firefox extension origins (`moz-extension://*`)
- Localhost development (`http://localhost:*`, `https://localhost:*`)

## Security

- GitHub client secrets are handled server-side only
- OAuth token exchange follows security best practices
- CORS is properly configured for extension origins 