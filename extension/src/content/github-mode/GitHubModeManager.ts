export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  description: string | null
  private: boolean
  html_url: string
  stargazers_count: number
  language: string | null
}

export interface GitHubUser {
  login: string
  name: string
  avatar_url: string
  html_url: string
}

export interface GitHubPR {
  number: number
  title: string
  html_url: string
  user: {
    login: string
    avatar_url: string
  }
  created_at: string
  state: string
}

export class GitHubModeManager {
  private isActive = false
  private isAuthenticated = false
  private user: GitHubUser | null = null
  private repos: GitHubRepo[] = []
  private token: string | null = null
  private onStateChangeCallback: ((isActive: boolean) => void) | null = null
  private onAuthStateChangeCallbacks: ((isAuthenticated: boolean, user?: GitHubUser) => void)[] = []

  // GitHub OAuth configuration - Client ID is safe to expose publicly
  private readonly CLIENT_ID = 'Ov23li3fozricPyZNVOi' // Replace with actual Client ID
  private readonly REDIRECT_URI = 'http://localhost:8000/api/github/callback' // Use backend for callback
  private readonly SCOPES = 'repo read:user'
  private readonly BACKEND_URL = 'http://localhost:8000' // Backend API base URL

  public async authenticate(): Promise<boolean> {
    try {
      console.log('🔐 Starting GitHub authentication...')
      console.log('🔧 Client ID:', this.CLIENT_ID)
      console.log('🔧 Redirect URI:', this.REDIRECT_URI)
      console.log('🔧 Backend URL:', this.BACKEND_URL)
      
      // Create OAuth URL
      const authUrl = new URL('https://github.com/login/oauth/authorize')
      authUrl.searchParams.set('client_id', this.CLIENT_ID)
      authUrl.searchParams.set('redirect_uri', this.REDIRECT_URI)
      authUrl.searchParams.set('scope', this.SCOPES)
      const state = this.generateState()
      authUrl.searchParams.set('state', state)

      console.log('🌐 Opening OAuth URL:', authUrl.toString())
      console.log('🔒 State parameter:', state)

      // Open OAuth popup
      const authWindow = window.open(
        authUrl.toString(),
        'github-auth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      )

      if (!authWindow) {
        console.error('❌ Failed to open authentication window - popup blocked?')
        throw new Error('Failed to open authentication window')
      }

      console.log('✅ Authentication window opened successfully')
      console.log('⏳ Waiting for auth message from callback page...')

      // Wait for authentication result using postMessage
      const authResult = await this.waitForAuthMessage()
      console.log('📝 Auth result received:', {
        hasCode: !!authResult.code,
        codeLength: authResult.code?.length,
        hasError: !!authResult.error
      })
      
      if (authResult.code) {
        console.log('🔑 Authorization code received, exchanging for token...')
        // Exchange code for access token
        const token = await this.exchangeCodeForToken(authResult.code)
        console.log('✅ Access token received successfully')
        
        // Store token securely
        await this.storeAccessToken(token)
        console.log('💾 Token stored securely')
        
        // Fetch user info and repos
        console.log('👤 Fetching user data...')
        await this.fetchUserData(token)
        console.log('📚 Fetching repositories...')
        await this.fetchRepositories(token)
        
        this.isAuthenticated = true
        this.notifyAuthStateChange()
        
        console.log('✅ GitHub authentication successful!')
        console.log('👤 User:', this.user?.login)
        console.log('📚 Repos count:', this.repos.length)
        return true
      }
      
      console.error('❌ No authorization code in auth result')
      throw new Error('Authentication failed')
    } catch (error) {
      console.error('❌ GitHub authentication error:', error)
      console.error('📊 Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      return false
    }
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15)
  }

  private waitForAuthMessage(): Promise<{ code?: string; error?: string }> {
    return new Promise((resolve, reject) => {
      console.log('📡 Setting up postMessage listener for OAuth callback...')
      
      const messageHandler = (event: MessageEvent) => {
        // Security: Verify origin
        if (event.origin !== this.BACKEND_URL) {
          console.log('🔒 Ignoring message from unknown origin:', event.origin)
          return
        }

        console.log('📨 Received message from OAuth callback:', event.data)

        if (event.data.type === 'GITHUB_AUTH_SUCCESS' && event.data.code) {
          console.log('✅ OAuth success message received')
          window.removeEventListener('message', messageHandler)
          resolve({ code: event.data.code })
        } else if (event.data.type === 'GITHUB_AUTH_ERROR') {
          console.error('❌ OAuth error message received:', event.data.error)
          window.removeEventListener('message', messageHandler)
          reject(new Error(event.data.error))
        }
      }

      // Listen for postMessage from the OAuth callback
      window.addEventListener('message', messageHandler)

      // Timeout after 5 minutes
      setTimeout(() => {
        window.removeEventListener('message', messageHandler)
        reject(new Error('Authentication timeout'))
      }, 300000)
    })
  }

  private async exchangeCodeForToken(code: string): Promise<string> {
    console.log('🔄 Exchanging authorization code for access token...')
    console.log('🔧 Using backend URL:', this.BACKEND_URL)
    console.log('🔧 Authorization code length:', code.length)
    console.log('🔧 First 10 chars of code:', code.substring(0, 10) + '...')
    
    try {
      console.log('📡 Making token exchange request...')
      // Exchange code for token via backend API immediately
      const response = await fetch(`${this.BACKEND_URL}/api/github/exchange`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ code }),
        mode: 'cors'
      })
      
      console.log('📡 Backend response status:', response.status)
      console.log('📡 Backend response headers:', {
        contentType: response.headers.get('content-type'),
        cors: response.headers.get('access-control-allow-origin')
      })
      
      const responseData = await response.json()
      console.log('📡 Backend response:', {
        hasError: 'error' in responseData || 'detail' in responseData,
        errorDetail: responseData.detail || responseData.error,
        hasToken: 'access_token' in responseData
      })
      
      if (!response.ok) {
        // Check for expired code
        if (responseData.detail?.includes('incorrect or expired')) {
          console.error('❌ Authorization code has expired')
          throw new Error('Authorization code expired - please try authenticating again')
        }
        throw new Error(responseData.detail || `Failed to exchange code for token: ${response.status}`)
      }
      
      console.log('✅ Token exchange successful')
      console.log('🔧 Response data keys:', Object.keys(responseData))
      console.log('🔧 Token type:', responseData.token_type || 'bearer')
      
      return responseData.access_token
    } catch (error) {
      console.error('❌ Token exchange failed:', error)
      console.error('📊 Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        isNetworkError: error instanceof TypeError && error.message.includes('fetch')
      })
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('🌐 Network error - is the backend running on', this.BACKEND_URL + '?')
      }
      throw error
    }
  }

  private async storeAccessToken(token: string): Promise<void> {
    // Store in extension storage securely
    if (chrome.storage) {
      await chrome.storage.local.set({ github_token: token })
    } else {
      // Fallback for development
      localStorage.setItem('github_token', token)
    }
  }

  private async getStoredToken(): Promise<string | null> {
    if (chrome.storage) {
      const result = await chrome.storage.local.get(['github_token'])
      return result.github_token || null
    } else {
      // Fallback for development
      return localStorage.getItem('github_token')
    }
  }

  private async fetchUserData(token: string): Promise<void> {
    console.log('👤 Fetching GitHub user data...')
    const response = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `token ${token}` }
    })
    
    console.log('📡 GitHub user API response status:', response.status)
    
    if (response.ok) {
      this.user = await response.json()
      console.log('✅ User data fetched:', this.user?.login)
    } else {
      console.error('❌ Failed to fetch user data:', response.status)
    }
  }

  private async fetchRepositories(token: string): Promise<void> {
    console.log('📚 Fetching GitHub repositories...')
    const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=20', {
      headers: { 'Authorization': `token ${token}` }
    })
    
    console.log('📡 GitHub repos API response status:', response.status)
    
    if (response.ok) {
      this.repos = await response.json()
      console.log('✅ Repositories fetched:', this.repos.length, 'repos')
    } else {
      console.error('❌ Failed to fetch repositories:', response.status)
    }
  }

  public async checkExistingAuth(): Promise<boolean> {
    const token = await this.getStoredToken()
    if (token) {
      try {
        await this.fetchUserData(token)
        await this.fetchRepositories(token)
        this.isAuthenticated = true
        this.notifyAuthStateChange()
        return true
      } catch (error) {
        // Token might be expired, clear it
        await this.clearStoredToken()
      }
    }
    return false
  }

  private async clearStoredToken(): Promise<void> {
    if (chrome.storage) {
      await chrome.storage.local.remove(['github_token'])
    } else {
      localStorage.removeItem('github_token')
    }
  }

  public async logout(): Promise<void> {
    await this.clearStoredToken()
    this.isAuthenticated = false
    this.user = null
    this.repos = []
    this.notifyAuthStateChange()
    console.log('👋 GitHub logout successful')
  }

  private notifyStateChange() {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(this.isActive)
    }
  }

  private notifyAuthStateChange() {
    this.onAuthStateChangeCallbacks.forEach(cb => {
      cb(this.isAuthenticated, this.user || undefined)
    })
  }

  public activate() {
    if (this.isActive) return
    
    this.isActive = true
    this.notifyStateChange()
    console.log('🐙 GitHub mode activated')
  }

  public deactivate() {
    if (!this.isActive) return
    
    this.isActive = false
    this.notifyStateChange()
    console.log('🐙 GitHub mode deactivated')
  }

  public toggle() {
    if (this.isActive) {
      this.deactivate()
    } else {
      this.activate()
    }
  }

  public isGitHubModeActive(): boolean {
    return this.isActive
  }

  public isUserAuthenticated(): boolean {
    return this.isAuthenticated
  }

  public getUser(): GitHubUser | null {
    return this.user
  }

  public getRepositories(): GitHubRepo[] {
    return this.repos
  }

  public onStateChange(callback: (isActive: boolean) => void) {
    this.onStateChangeCallback = callback
  }

  public onAuthStateChange(callback: (isAuthenticated: boolean, user?: GitHubUser) => void) {
    this.onAuthStateChangeCallbacks.push(callback)
  }

  public cleanup() {
    this.deactivate()
    this.onStateChangeCallback = null
    this.onAuthStateChangeCallbacks = []
  }

  public async fetchPullRequests(repoFullName: string): Promise<GitHubPR[]> {
    console.log('🔄 Fetching pull requests for', repoFullName)
    const token = await this.getStoredToken()
    
    if (!token) {
      console.error('❌ No token available to fetch PRs')
      return []
    }

    try {
      const response = await fetch(`https://api.github.com/repos/${repoFullName}/pulls?state=open`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch PRs: ${response.status}`)
      }

      const prs: GitHubPR[] = await response.json()
      console.log('✅ Fetched', prs.length, 'pull requests')
      return prs
    } catch (error) {
      console.error('❌ Error fetching pull requests:', error)
      return []
    }
  }

  public async createIssue(repoFullName: string, title: string, body: string): Promise<string | null> {
    console.log('📝 Creating issue in', repoFullName)
    const token = await this.getStoredToken()
    
    if (!token) {
      console.error('❌ No token available to create issue')
      return null
    }

    try {
      const response = await fetch(`https://api.github.com/repos/${repoFullName}/issues`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          body
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to create issue: ${response.status}`)
      }

      const issue = await response.json()
      console.log('✅ Created issue:', issue.html_url)
      return issue.html_url
    } catch (error) {
      console.error('❌ Error creating issue:', error)
      return null
    }
  }
}

// Create a singleton instance
export const gitHubModeManager = new GitHubModeManager() 