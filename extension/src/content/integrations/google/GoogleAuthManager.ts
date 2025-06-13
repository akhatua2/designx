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
      const storedUser = localStorage.getItem('google_user')
      
      if (storedToken) {
        console.log('🔍 Found stored Google token, verifying...')
        
        try {
          // Verify token is still valid
          const response = await fetch(`${this.API_BASE}/api/user/me`, {
            headers: {
              'Authorization': `Bearer ${storedToken}`
            }
          })
          
          if (response.ok) {
            const userData = await response.json()
            console.log('📊 Server returned user data:', userData)
            
            // Validate user data has required fields
            if (userData && userData.email && userData.name) {
              this.user = userData
              this.token = storedToken
              this.isAuthenticated = true
              console.log('✅ Existing Google auth verified with server:', userData.email)
              this.notifyAuthStateChange()
              return
            } else {
              console.warn('⚠️ Server returned incomplete user data:', userData)
            }
          } else {
            console.warn('⚠️ Server token validation failed:', response.status, response.statusText)
          }
        } catch (fetchError) {
          console.warn('⚠️ Network error during token validation:', fetchError)
        }
        
        // If server verification failed but we have stored user data, use it temporarily
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser)
            console.log('📊 Cached user data:', userData)
            
            // Validate cached user data has required fields
            if (userData && userData.email && userData.name) {
              this.user = userData
              this.token = storedToken
              this.isAuthenticated = true
              console.log('✅ Using cached Google auth data:', userData.email)
              console.log('ℹ️ (Server verification failed, but using cached data)')
              this.notifyAuthStateChange()
              return
            } else {
              console.warn('⚠️ Cached user data incomplete:', userData)
            }
          } catch (parseError) {
            console.error('❌ Failed to parse stored user data:', parseError)
          }
        }
        
        // If we reach here, both server verification and cached data failed
        console.log('🧹 Clearing invalid auth data')
        this.clearAuth()
      } else {
        console.log('🔍 No stored Google token found')
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
        googleAuthUrl.searchParams.set('client_id', '705035175306-2adpnhaltkhkd9i17d4s693pqknrt6r2.apps.googleusercontent.com')
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
          console.log('📨 Received message:', event.data, 'from:', event.origin)
          
          // More flexible origin checking for development and production
          const allowedOrigins = [
            this.API_BASE,
            'https://designx-705035175306.us-central1.run.app',
            'http://localhost:8000', // For local development
            'https://localhost:8000'
          ]
          
          if (!allowedOrigins.includes(event.origin)) {
            console.warn('⚠️ Message from unallowed origin:', event.origin)
            return
          }

          if (event.data.type === 'GOOGLE_AUTH_SUCCESS' && event.data.code) {
            console.log('✅ Google auth code received')
            
            try {
              // Exchange authorization code for our JWT (server handles Google token exchange)
              const authResponse = await fetch(`${this.API_BASE}/api/google/exchange`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  code: event.data.code
                })
              })

              if (authResponse.ok) {
                const authData: GoogleAuthResponse = await authResponse.json()
                console.log('📊 Auth response from server:', authData)
                
                // Validate the response has required data
                if (authData && authData.access_token && authData.user && authData.user.email) {
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
                  console.error('❌ Invalid auth response from server:', authData)
                  resolve(false)
                }
              } else {
                const errorText = await authResponse.text()
                console.error('❌ Failed to exchange token with backend:', authResponse.status, errorText)
                resolve(false)
              }
              
            } catch (error) {
              console.error('❌ Error during token exchange:', error)
              resolve(false)
            }
            
            // Clean up
            try {
              if (popup && !popup.closed) {
                popup.close()
              }
            } catch (closeError) {
              console.warn('⚠️ Could not close popup:', closeError)
            }
            window.removeEventListener('message', handleMessage)
            
          } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
            console.error('❌ Google auth error:', event.data.error)
            resolve(false)
            try {
              if (popup && !popup.closed) {
                popup.close()
              }
            } catch (closeError) {
              console.warn('⚠️ Could not close popup:', closeError)
            }
            window.removeEventListener('message', handleMessage)
          }
        }

        window.addEventListener('message', handleMessage)

        // Check if popup was closed manually
        const checkClosed = setInterval(() => {
          try {
            if (popup.closed) {
              clearInterval(checkClosed)
              window.removeEventListener('message', handleMessage)
              console.log('🔒 Google auth popup closed manually')
              resolve(false)
            }
          } catch (error) {
            // COOP policy may block access to popup.closed
            console.warn('⚠️ Cannot check popup status (COOP policy):', error)
            // Don't clear the interval immediately, give it more time
          }
        }, 1000)

        // Fallback timeout in case popup checking fails
        setTimeout(() => {
          clearInterval(checkClosed)
          window.removeEventListener('message', handleMessage)
          if (!this.isAuthenticated) {
            console.log('⏰ Google auth timeout')
            try {
              if (popup && !popup.closed) {
                popup.close()
              }
            } catch (closeError) {
              console.warn('⚠️ Could not close popup on timeout:', closeError)
            }
            resolve(false)
          }
        }, 60000) // 60 second timeout

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