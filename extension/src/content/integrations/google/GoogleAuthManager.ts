interface GoogleUser {
  id: string
  email: string
  name: string
  picture: string
  google_id: string
  provider: string
  created_at: string
  last_login: string
}

interface GoogleAuthResponse {
  access_token: string
  token_type: string
  user: GoogleUser
}

class GoogleAuthManager {
  private static instance: GoogleAuthManager
  private isAuthenticated = false
  private user: GoogleUser | null = null
  private token: string | null = null
  private authStateCallbacks: ((isAuthenticated: boolean, user?: GoogleUser) => void)[] = []
  private readonly API_BASE = 'https://designx-705035175306.us-central1.run.app'

  private constructor() {
    this.checkExistingAuth()
  }

  static getInstance(): GoogleAuthManager {
    if (!GoogleAuthManager.instance) {
      GoogleAuthManager.instance = new GoogleAuthManager()
    }
    return GoogleAuthManager.instance
  }

  onAuthStateChange(callback: (isAuthenticated: boolean, user?: GoogleUser) => void) {
    this.authStateCallbacks.push(callback)
  }

  private notifyAuthStateChange() {
    this.authStateCallbacks.forEach(callback => {
      callback(this.isAuthenticated, this.user || undefined)
    })
  }

  async checkExistingAuth(): Promise<void> {
    try {
      const storedToken = localStorage.getItem('google_auth_token')
      if (storedToken) {
        // Verify token is still valid
        const response = await fetch(`${this.API_BASE}/api/user/me`, {
          headers: {
            'Authorization': `Bearer ${storedToken}`
          }
        })
        
        if (response.ok) {
          const userData = await response.json()
          this.user = userData
          this.token = storedToken
          this.isAuthenticated = true
          console.log('✅ Existing Google auth found:', userData.email)
          this.notifyAuthStateChange()
        } else {
          // Token is invalid, clear it
          this.clearAuth()
        }
      }
    } catch (error) {
      console.error('❌ Error checking existing Google auth:', error)
      this.clearAuth()
    }
  }

  async authenticate(): Promise<boolean> {
    if (this.isAuthenticated) {
      return true
    }

    return new Promise((resolve) => {
      try {
        console.log('🔄 Starting Google authentication...')
        
        // Create a unique state parameter for security
        const state = Math.random().toString(36).substring(2, 15)
        
        // Build Google OAuth URL
        const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
        googleAuthUrl.searchParams.set('client_id', '705035175306-your-client-id.apps.googleusercontent.com') // You'll need to replace this
        googleAuthUrl.searchParams.set('redirect_uri', `${this.API_BASE}/api/google/callback`)
        googleAuthUrl.searchParams.set('response_type', 'code')
        googleAuthUrl.searchParams.set('scope', 'openid email profile')
        googleAuthUrl.searchParams.set('state', state)
        
        // Open popup
        const popup = window.open(
          googleAuthUrl.toString(),
          'google-auth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        )

        if (!popup) {
          console.error('❌ Popup blocked')
          resolve(false)
          return
        }

        // Listen for messages from popup
        const handleMessage = async (event: MessageEvent) => {
          if (event.origin !== this.API_BASE) {
            return
          }

          if (event.data.type === 'GOOGLE_AUTH_SUCCESS' && event.data.code) {
            console.log('✅ Google auth code received')
            
            try {
              // Exchange authorization code for Google ID token
              const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                  code: event.data.code,
                  client_id: '705035175306-your-client-id.apps.googleusercontent.com', // Replace with actual client ID
                  client_secret: 'your-client-secret', // This should be handled server-side in production
                  redirect_uri: `${this.API_BASE}/api/google/callback`,
                  grant_type: 'authorization_code'
                })
              })

              const tokenData = await tokenResponse.json()
              
              if (tokenData.id_token) {
                // Exchange Google ID token for our JWT
                const authResponse = await fetch(`${this.API_BASE}/api/google/exchange`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    token: tokenData.id_token
                  })
                })

                if (authResponse.ok) {
                  const authData: GoogleAuthResponse = await authResponse.json()
                  
                  // Store auth data
                  this.token = authData.access_token
                  this.user = authData.user
                  this.isAuthenticated = true
                  
                  localStorage.setItem('google_auth_token', authData.access_token)
                  localStorage.setItem('google_user', JSON.stringify(authData.user))
                  
                  console.log('✅ Google authentication successful:', authData.user.email)
                  this.notifyAuthStateChange()
                  resolve(true)
                } else {
                  console.error('❌ Failed to exchange token with backend')
                  resolve(false)
                }
              } else {
                console.error('❌ No ID token received from Google')
                resolve(false)
              }
              
            } catch (error) {
              console.error('❌ Error during token exchange:', error)
              resolve(false)
            }
            
            popup.close()
            window.removeEventListener('message', handleMessage)
            
          } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
            console.error('❌ Google auth error:', event.data.error)
            resolve(false)
            popup.close()
            window.removeEventListener('message', handleMessage)
          }
        }

        window.addEventListener('message', handleMessage)

        // Check if popup was closed manually
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed)
            window.removeEventListener('message', handleMessage)
            console.log('🔒 Google auth popup closed manually')
            resolve(false)
          }
        }, 1000)

      } catch (error) {
        console.error('❌ Google authentication error:', error)
        resolve(false)
      }
    })
  }

  async logout(): Promise<void> {
    this.clearAuth()
    this.notifyAuthStateChange()
    console.log('👋 Google logout successful')
  }

  private clearAuth(): void {
    localStorage.removeItem('google_auth_token')
    localStorage.removeItem('google_user')
    this.user = null
    this.token = null
    this.isAuthenticated = false
  }

  getToken(): string | null {
    return this.token
  }

  getUser(): GoogleUser | null {
    return this.user
  }

  isUserAuthenticated(): boolean {
    return this.isAuthenticated
  }

  cleanup(): void {
    this.authStateCallbacks = []
  }
}

export const googleAuthManager = GoogleAuthManager.getInstance()
export type { GoogleUser } 