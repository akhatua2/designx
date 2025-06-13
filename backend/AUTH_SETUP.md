# Google Authentication + Supabase Setup Guide

This guide will help you set up Google OAuth authentication with Supabase for the DesignX browser extension.

## Prerequisites

- Google Cloud Console account
- Supabase account and project
- Basic understanding of OAuth 2.0

## 1. Google Cloud Console Setup

### Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add authorized redirect URIs:
     ```
     http://localhost:8000/api/google/callback
     https://your-domain.com/api/google/callback
     ```
   - Save the Client ID and Client Secret

## 2. Supabase Setup

### Create Supabase Project

1. Go to [Supabase](https://supabase.com/)
2. Create a new project
3. Note down your project URL and anon key

### Set up Database Schema

1. Go to your Supabase dashboard
2. Navigate to "SQL Editor"
3. Run the SQL script from `supabase_setup.sql`:

```sql
-- Create a simple users table for storing authenticated users
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    picture TEXT,
    google_id VARCHAR(255) UNIQUE,
    provider VARCHAR(50) DEFAULT 'google',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Create basic indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) - but keep it simple
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Simple policies - allow all operations for now (can be restricted later)
CREATE POLICY "Allow all operations on users" ON users
    FOR ALL USING (true) WITH CHECK (true);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON users TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
```

## 3. Environment Configuration

Create a `.env` file in your backend directory:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# JWT Secret (generate a secure random string)
JWT_SECRET=your_super_secure_jwt_secret_here

# CORS Settings
ALLOWED_ORIGINS=["http://localhost:3000", "chrome-extension://your-extension-id"]
```

## 4. Install Dependencies

```bash
pip install -r requirements.txt
```

The required packages are:
- `supabase==2.3.4`
- `google-auth==2.25.2`
- `google-auth-oauthlib==1.2.0`
- `google-auth-httplib2==0.2.0`
- `PyJWT==2.8.0`

## 5. Test the Setup

### Start the Backend Server

```bash
cd backend
python main.py
```

### Test Authentication Flow

1. **Health Check**: Visit `http://localhost:8000/health`
2. **Google Auth**: The extension will handle the OAuth flow
3. **User Info**: After authentication, you can call `/api/user/me` with the JWT token

## 6. Frontend Integration

The browser extension should:

1. **Initiate OAuth**: Open a popup to `/api/google/callback`
2. **Handle Callback**: Listen for the success message with the authorization code
3. **Exchange Token**: Send the Google ID token to `/api/google/exchange`
4. **Store JWT**: Save the returned JWT token for API calls
5. **Use Token**: Include `Authorization: Bearer <jwt_token>` in API requests

## 7. Security Considerations

### JWT Token Security
- Tokens expire after 24 hours
- Store tokens securely in the extension
- Implement token refresh if needed

### CORS Configuration
- Add your extension ID to `ALLOWED_ORIGINS`
- Use HTTPS in production

### Environment Variables
- Never commit `.env` files
- Use secure, random values for `JWT_SECRET`
- Rotate secrets regularly

## 8. Troubleshooting

### Common Issues

1. **"Invalid token" errors**
   - Check Google Client ID configuration
   - Verify token hasn't expired
   - Ensure proper token format

2. **CORS errors**
   - Add extension ID to `ALLOWED_ORIGINS`
   - Check redirect URI configuration

3. **Database connection issues**
   - Verify Supabase URL and key
   - Check network connectivity
   - Review RLS policies

### Debugging

Enable debug logging by setting:
```env
LOG_LEVEL=DEBUG
```

### Database Queries

Check user creation:
```sql
SELECT * FROM users ORDER BY created_at DESC LIMIT 10;
```

## 9. Production Deployment

### Environment Setup
- Use production Supabase project
- Set secure `JWT_SECRET`
- Configure production redirect URIs
- Enable HTTPS

### Monitoring
- Monitor authentication success/failure rates
- Track user registration patterns
- Set up error alerting

This simplified setup provides a solid foundation for Google authentication with room to add more features like session tracking or activity logging as needed. 