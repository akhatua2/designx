import type { 
  IntegrationManager, 
  Project, 
  UserProfile, 
  Issue 
} from '../IntegrationManager'

// --- Internal Data Models ---

export interface SlackChannel extends Project {
  id: string
  name: string
  is_private: boolean
  is_channel: boolean
  num_members: number
}

export interface SlackUser extends UserProfile {
  team_id: string
  team_name: string
}

export interface SlackMessage extends Issue {
  channel_id: string
  timestamp: string
  reactions?: Array<{
    name: string
    count: number
    users: string[]
  }>
}

// --- Raw API Response Types ---

interface SlackApiChannel {
  id: string
  name: string
  is_channel: boolean
  is_private: boolean
  num_members: number
  topic: {
    value: string
  }
}

interface SlackApiUser {
  id: string
  team_id: string
  name: string
  real_name: string
  profile: {
    real_name: string
    display_name: string
    image_72: string
  }
}

export class SlackModeManager implements IntegrationManager {
  public readonly name = 'Slack';

  private isActive = false
  private isAuthenticated = false
  private user: SlackUser | null = null
  private channels: SlackChannel[] = []
  private token: string | null = null
  private onStateChangeCallback: ((isActive: boolean) => void) | null = null
  private onAuthStateChangeCallbacks: ((isAuthenticated: boolean, user?: SlackUser) => void)[] = []

  // Slack OAuth configuration
  private readonly CLIENT_ID = 'YOUR_SLACK_CLIENT_ID'
  private readonly REDIRECT_URI = 'https://designx-705035175306.us-central1.run.app/api/slack/callback'
  private readonly SCOPES = [
    'channels:read',
    'channels:write',
    'chat:write',
    'groups:read',
    'reactions:read',
    'users:read'
  ].join(',')
  private readonly BACKEND_URL = 'https://designx-705035175306.us-central1.run.app'

  public async authenticate(): Promise<boolean> {
    try {
      console.log('🔐 Starting Slack authentication...')
      
      // Create OAuth URL
      const authUrl = new URL('https://slack.com/oauth/v2/authorize')
      authUrl.searchParams.set('client_id', this.CLIENT_ID)
      authUrl.searchParams.set('redirect_uri', this.REDIRECT_URI)
      authUrl.searchParams.set('scope', this.SCOPES)
      const state = this.generateState()
      authUrl.searchParams.set('state', state)

      console.log('🌐 Opening OAuth URL:', authUrl.toString())

      // Open OAuth popup
      const authWindow = window.open(
        authUrl.toString(),
        'slack-auth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      )

      if (!authWindow) {
        throw new Error('Failed to open authentication window')
      }

      // Wait for authentication result
      const authResult = await this.waitForAuthMessage()
      
      if (authResult.code) {
        // Exchange code for access token
        const token = await this.exchangeCodeForToken(authResult.code)
        
        // Store token securely
        await this.storeAccessToken(token)
        
        // Fetch user info and channels
        await this.fetchUserData(token)
        await this.fetchChannels(token)
        
        this.isAuthenticated = true
        this.notifyAuthStateChange()
        
        return true
      }
      
      throw new Error('Authentication failed')
    } catch (error) {
      console.error('❌ Slack authentication error:', error)
      return false
    }
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15)
  }

  private waitForAuthMessage(): Promise<{ code?: string; error?: string }> {
    return new Promise((resolve, reject) => {
      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== this.BACKEND_URL) return

        if (event.data.type === 'SLACK_AUTH_SUCCESS' && event.data.code) {
          window.removeEventListener('message', messageHandler)
          resolve({ code: event.data.code })
        } else if (event.data.type === 'SLACK_AUTH_ERROR') {
          window.removeEventListener('message', messageHandler)
          reject(new Error(event.data.error))
        }
      }

      window.addEventListener('message', messageHandler)

      // Timeout after 5 minutes
      setTimeout(() => {
        window.removeEventListener('message', messageHandler)
        reject(new Error('Authentication timeout'))
      }, 300000)
    })
  }

  private async exchangeCodeForToken(code: string): Promise<string> {
    const response = await fetch(`${this.BACKEND_URL}/api/slack/exchange`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ code }),
      mode: 'cors'
    })

    if (!response.ok) {
      throw new Error(`Failed to exchange code for token: ${response.status}`)
    }

    const data = await response.json()
    return data.access_token
  }

  private async storeAccessToken(token: string): Promise<void> {
    if (chrome.storage) {
      await chrome.storage.local.set({ slack_token: token })
    } else {
      localStorage.setItem('slack_token', token)
    }
  }

  private async getStoredToken(): Promise<string | null> {
    if (chrome.storage) {
      const result = await chrome.storage.local.get(['slack_token'])
      return result.slack_token || null
    }
    return localStorage.getItem('slack_token')
  }

  private async fetchUserData(token: string): Promise<void> {
    const response = await fetch('https://slack.com/api/users.identity', {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch user data')
    }

    const data = await response.json()
    if (!data.ok) {
      throw new Error(data.error || 'Failed to fetch user data')
    }

    this.user = {
      login: data.user.name,
      name: data.user.real_name || data.user.name,
      avatar_url: data.user.profile.image_72,
      html_url: '', // Slack doesn't have profile URLs
      team_id: data.team.id,
      team_name: data.team.name
    }
  }

  private async fetchChannels(token: string): Promise<SlackChannel[]> {
    const response = await fetch('https://slack.com/api/conversations.list', {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch channels')
    }

    const data = await response.json()
    if (!data.ok) {
      throw new Error(data.error || 'Failed to fetch channels')
    }

    this.channels = data.channels.map((channel: SlackApiChannel) => ({
      id: channel.id,
      name: channel.name,
      full_name: `#${channel.name}`,
      description: channel.topic?.value || null,
      url: '', // Slack doesn't have public URLs for channels
      is_private: channel.is_private,
      is_channel: channel.is_channel,
      num_members: channel.num_members
    }))

    return this.channels
  }

  public async checkExistingAuth(): Promise<boolean> {
    const token = await this.getStoredToken()
    if (token) {
      this.token = token
      try {
        await this.fetchUserData(token)
        if (this.user) {
          await this.fetchChannels(token)
          this.isAuthenticated = true
          this.notifyAuthStateChange()
          return true
        }
      } catch (error) {
        await this.clearStoredToken()
      }
    }
    return false
  }

  private async clearStoredToken(): Promise<void> {
    if (chrome.storage) {
      await chrome.storage.local.remove(['slack_token'])
    } else {
      localStorage.removeItem('slack_token')
    }
  }

  public async logout(): Promise<void> {
    await this.clearStoredToken()
    this.isAuthenticated = false
    this.user = null
    this.channels = []
    this.notifyAuthStateChange()
  }

  // IntegrationManager interface implementation
  public isUserAuthenticated(): boolean {
    return this.isAuthenticated
  }

  public getUser(): SlackUser | null {
    return this.user
  }

  public getProjects(): Project[] {
    return this.channels
  }

  public async fetchProjects(): Promise<Project[]> {
    if (!this.token) {
      this.token = await this.getStoredToken()
    }
    
    if (this.token) {
      return this.fetchChannels(this.token)
    }
    
    return []
  }

  public async fetchIssues(channelId: string): Promise<Issue[]> {
    // For Slack, we'll fetch recent messages in the channel
    if (!this.token) return []

    const response = await fetch(`https://slack.com/api/conversations.history?channel=${channelId}`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    })

    if (!response.ok) return []

    const data = await response.json()
    if (!data.ok) return []

    return data.messages.map((msg: any) => ({
      id: msg.ts,
      number: 0, // Slack messages don't have numbers
      title: msg.text.split('\n')[0], // First line as title
      url: '', // Slack doesn't have public URLs for messages
      channel_id: channelId,
      timestamp: msg.ts,
      reactions: msg.reactions
    }))
  }

  public async createIssue(channelId: string, title: string, body: string): Promise<string | null> {
    // For Slack, this posts a message to a channel
    if (!this.token) return null

    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channel: channelId,
        text: `${title}\n\n${body}`,
        unfurl_links: false,
        unfurl_media: false
      })
    })

    if (!response.ok) return null

    const data = await response.json()
    if (!data.ok) return null

    // Return the message timestamp as an identifier
    return data.ts
  }

  public activate(): void {
    if (this.isActive) return
    this.isActive = true
    this.notifyStateChange()
  }

  public deactivate(): void {
    if (!this.isActive) return
    this.isActive = false
    this.notifyStateChange()
  }

  public toggle(): void {
    if (this.isActive) {
      this.deactivate()
    } else {
      this.activate()
    }
  }

  private notifyStateChange(): void {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(this.isActive)
    }
  }

  private notifyAuthStateChange(): void {
    this.onAuthStateChangeCallbacks.forEach(cb => {
      cb(this.isAuthenticated, this.user || undefined)
    })
  }

  public onStateChange(callback: (isActive: boolean) => void): void {
    this.onStateChangeCallback = callback
  }

  public onAuthStateChange(callback: (isAuthenticated: boolean, user?: SlackUser) => void): void {
    this.onAuthStateChangeCallbacks.push(callback)
  }

  public cleanup(): void {
    this.deactivate()
    this.onStateChangeCallback = null
    this.onAuthStateChangeCallbacks = []
  }
}

// Create a singleton instance
export const slackModeManager = new SlackModeManager() 