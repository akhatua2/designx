# GitHub OAuth Setup Guide

This guide will help you set up GitHub OAuth for the DesignX browser extension.

## Step 1: Create a GitHub OAuth App

1. **Go to GitHub Developer Settings:**
   - Navigate to [GitHub Settings > Developer settings > OAuth Apps](https://github.com/settings/developers)
   - Or go to GitHub → Settings → Developer settings → OAuth Apps

2. **Create a New OAuth App:**
   - Click "New OAuth App"
   - Fill in the application details:
     - **Application name:** `DesignX Extension`
     - **Homepage URL:** `http://localhost:8000`
     - **Application description:** `Browser extension for design collaboration`
     - **Authorization callback URL:** `http://localhost:8000/api/github/callback`

3. **Register the Application:**
   - Click "Register application"
   - You'll be redirected to your new OAuth app's settings page

## Step 2: Configure Your Backend

1. **Copy OAuth Credentials:**
   - From your OAuth app settings page, copy the **Client ID**
   - Click "Generate a new client secret" and copy the **Client Secret**

2. **Create Backend Environment File:**
   ```bash
   cd backend
   touch .env
   ```

3. **Add Credentials to .env:**
   ```env
   GITHUB_CLIENT_ID=your_client_id_here
   GITHUB_CLIENT_SECRET=your_client_secret_here
   PORT=8000
   HOST=0.0.0.0
   DEBUG=True
   ```

## Step 3: Update Extension Configuration

1. **Open GitHubModeManager.ts:**
   ```bash
   # Open extension/src/content/github-mode/GitHubModeManager.ts
   ```

2. **Update Client ID:**
   Replace `your_github_client_id_here` with your actual GitHub Client ID:
   ```typescript
   private readonly CLIENT_ID = 'your_actual_client_id_here'
   ```

## Step 4: Start the Backend

1. **Run the start script:**
   ```bash
   cd backend
   ./start.sh
   ```

   Or manually:
   ```bash
   cd backend
   pip install -r requirements.txt
   python main.py
   ```

2. **Verify backend is running:**
   - Open http://localhost:8000 in your browser
   - You should see: `{"message": "DesignX Extension API is running"}`
   - API docs available at: http://localhost:8000/docs

## Step 5: Test the Integration

1. **Load your extension** in Chrome/Firefox
2. **Click the GitHub icon** in the floating pill
3. **Click "Connect to GitHub"**
4. **You should be redirected** to GitHub for authentication
5. **After authorization**, you should see your GitHub profile and repositories

## Troubleshooting

### Common Issues:

1. **"GitHub credentials not configured" error:**
   - Make sure your `.env` file exists in the `backend/` directory
   - Verify your Client ID and Client Secret are correct
   - Restart the backend server after updating `.env`

2. **"Failed to exchange code for token" error:**
   - Check that your Authorization callback URL in GitHub matches exactly: `http://localhost:8000/api/github/callback`
   - Ensure the backend is running on port 8000
   - Check browser console for CORS errors

3. **CORS errors:**
   - Make sure the backend is running on `localhost:8000`
   - Check that the `BACKEND_URL` in GitHubModeManager matches your backend URL

4. **Extension not loading:**
   - Make sure you've updated the Client ID in `GitHubModeManager.ts`
   - Rebuild/reload your extension after making changes

### Security Notes:

- **Client ID** is safe to expose publicly (it's meant to be public)
- **Client Secret** must be kept secure and only used on the backend
- The backend handles the secure token exchange
- Tokens are stored securely in extension storage

### Development vs Production:

For **production deployment**:
- Change `BACKEND_URL` to your production API endpoint
- Update the GitHub OAuth callback URL to match your production domain
- Use environment-specific `.env` files
- Enable HTTPS for production

For **development**:
- Keep `localhost:8000` configuration
- Use `DEBUG=True` in your `.env` file
- The current setup is perfect for local development 