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
  private readonly CLIENT_ID = '8801814161477.9032177471110'
  private readonly REDIRECT_URI = 'https://designx-705035175306.us-central1.run.app/api/slack/callback'
  private readonly SCOPES = [
    'channels:read',
    'channels:write.invites',
    'channels:write.topic',
    'chat:write',
    'groups:read',
    'reactions:read',
    'users:read',
    'channels:history',
    'groups:history',
    'mpim:history',
    'im:history'
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
        console.error('❌ Failed to open authentication window')
        throw new Error('Failed to open authentication window')
      }

      // Wait for authentication result
      console.log('⏳ Waiting for auth message...')
      const authResult = await this.waitForAuthMessage()
      
      if (authResult.code) {
        console.log('✅ Received auth code, exchanging for token...')
        // Exchange code for access token
        const token = await this.exchangeCodeForToken(authResult.code)
        
        console.log('💾 Storing access token...')
        // Store token securely
        await this.storeAccessToken(token)
        
        console.log('👤 Fetching user data...')
        // Fetch user info and channels
        await this.fetchUserData(token)
        
        console.log('📋 Fetching channels...')
        await this.fetchChannels(token)
        
        this.isAuthenticated = true
        this.notifyAuthStateChange()
        
        console.log('🎉 Authentication completed successfully!')
        return true
      }
      
      console.error('❌ Authentication failed - no code received')
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
    console.log('🔍 Starting fetchUserData with token type:', token.substring(0, 4) + '...')
    
    try {
      console.log('📡 Making request to auth.test endpoint...')
      const formData = new URLSearchParams()
      formData.append('token', token)
      
      const response = await fetch('https://slack.com/api/auth.test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      })

      console.log('📥 Response status:', response.status)
      
      if (!response.ok) {
        console.error('❌ Response not OK:', response.status, response.statusText)
        throw new Error(`Failed to fetch user data: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log('📄 Response data:', JSON.stringify(data, null, 2))
      
      if (!data.ok) {
        console.error('❌ Slack API error:', data.error)
        throw new Error(data.error || 'Failed to fetch user data')
      }

      console.log('✅ Successfully fetched user data')
      this.user = {
        login: data.user,
        name: data.user,
        avatar_url: '',
        html_url: '',
        team_id: data.team_id,
        team_name: data.team
      }
    } catch (error) {
      console.error('❌ Error in fetchUserData:', error)
      throw error
    }
  }

  private async fetchChannels(token: string): Promise<SlackChannel[]> {
    console.log('📡 Making request to conversations.list endpoint...')
    const formData = new URLSearchParams()
    formData.append('token', token)
    
    const response = await fetch('https://slack.com/api/conversations.list', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    })

    if (!response.ok) {
      console.error('❌ Response not OK:', response.status, response.statusText)
      throw new Error('Failed to fetch channels')
    }

    const data = await response.json()
    console.log('📄 Channels response:', JSON.stringify(data, null, 2))
    
    if (!data.ok) {
      console.error('❌ Slack API error:', data.error)
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

    console.log('📡 Making request to conversations.history for channel:', channelId)
    const formData = new URLSearchParams()
    formData.append('token', this.token)
    formData.append('channel', channelId)
    formData.append('limit', '10') // Limit to 10 messages

    const response = await fetch('https://slack.com/api/conversations.history', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    })

    if (!response.ok) {
      console.error('❌ Response not OK:', response.status, response.statusText)
      return []
    }

    const data = await response.json()
    console.log('📄 Messages response:', JSON.stringify(data, null, 2))
    
    if (!data.ok) {
      console.error('❌ Slack API error:', data.error)
      return []
    }

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

    const formData = new URLSearchParams()
    formData.append('token', this.token)
    formData.append('channel', channelId)
    formData.append('text', title + (body ? `\n\n${body}` : ''))

    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    })

    if (!response.ok) {
      console.error('❌ Failed to send message:', response.status, response.statusText)
      return null
    }

    const data = await response.json()
    console.log('📄 Message response:', JSON.stringify(data, null, 2))
    
    if (!data.ok) {
      console.error('❌ Slack API error:', data.error)
      return null
    }

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