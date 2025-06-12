import type { 
  IntegrationManager, 
  Project, 
  UserProfile, 
  Issue
} from '../IntegrationManager'

// --- Internal Data Models ---
// These extend the generic interfaces and are used within the application.

export interface JiraProject extends Project {
  key: string
  projectTypeKey: string
  projectCategory?: {
    id: string
    name: string
    description: string
  }
  lead?: {
    accountId: string
    displayName: string
    avatarUrls: Record<string, string>
  }
}

export interface JiraUser extends UserProfile {
  accountId: string
  emailAddress?: string
  displayName: string
  timeZone?: string
}

export interface JiraIssue extends Issue {
  key: string
  fields: {
    summary: string
    description?: string
    status: {
      name: string
      statusCategory: {
        colorName: string
      }
    }
    issuetype: {
      name: string
      iconUrl: string
    }
    assignee?: {
      displayName: string
      avatarUrls: Record<string, string>
    }
    reporter: {
      displayName: string
      avatarUrls: Record<string, string>
    }
    created: string
    updated: string
  }
  self: string
}

// --- Raw API Response Types ---

interface JiraApiProject {
  id: string
  key: string
  name: string
  description: string
  projectTypeKey: string
  simplified: boolean
  url: string
  projectCategory?: {
    id: string
    name: string
    description: string
  }
  lead?: {
    accountId: string
    displayName: string
    avatarUrls: Record<string, string>
  }
}

interface JiraApiIssue {
  id: string
  key: string
  self: string
  fields: {
    summary: string
    description?: string
    status: {
      name: string
      statusCategory: {
        colorName: string
      }
    }
    issuetype: {
      name: string
      iconUrl: string
    }
    assignee?: {
      displayName: string
      avatarUrls: Record<string, string>
    }
    reporter: {
      displayName: string
      avatarUrls: Record<string, string>
    }
    created: string
    updated: string
  }
}

interface JiraApiUser {
  accountId: string
  accountType: string
  emailAddress?: string
  avatarUrls: Record<string, string>
  displayName: string
  active: boolean
  timeZone?: string
  locale?: string
}

export class JiraModeManager implements IntegrationManager {
  public readonly name = 'Jira';

  private isActive = false
  private isAuthenticated = false
  private user: JiraUser | null = null
  private projects: JiraProject[] = []
  private token: string | null = null
  private baseUrl: string | null = null // Jira instance URL
  private onStateChangeCallback: ((isActive: boolean) => void) | null = null
  private onAuthStateChangeCallbacks: ((isAuthenticated: boolean, user?: JiraUser) => void)[] = []

  // Jira OAuth configuration
  private readonly CLIENT_ID = 'your-jira-oauth-client-id' // Replace with actual Client ID
  private readonly REDIRECT_URI = 'https://designx-705035175306.us-central1.run.app/api/jira/callback'
  private readonly SCOPES = 'read:jira-work read:jira-user write:jira-work'
  private readonly BACKEND_URL = 'https://designx-705035175306.us-central1.run.app'

  public async authenticate(): Promise<boolean> {
    try {
      console.log('🔐 Starting Jira authentication...')
      
      // First, get the Jira instance URL from user
      const jiraUrl = await this.getJiraInstanceUrl()
      if (!jiraUrl) {
        throw new Error('Jira instance URL is required')
      }
      
      this.baseUrl = jiraUrl
      console.log('🏢 Jira instance URL:', this.baseUrl)
      
      // Create OAuth URL for Jira Cloud
      const authUrl = new URL(`${this.baseUrl}/plugins/servlet/oauth/authorize`)
      authUrl.searchParams.set('oauth_token', 'temp-token') // This would be obtained from request token flow
      
      // For Jira Cloud, we'll use a different approach with API tokens
      // Since Jira OAuth 1.0a is complex, we'll implement API token authentication
      const apiToken = await this.getApiTokenFromUser()
      if (!apiToken) {
        throw new Error('API token is required')
      }

      // Test the API token
      const isValid = await this.validateApiToken(jiraUrl, apiToken)
      if (!isValid) {
        throw new Error('Invalid Jira credentials')
      }

      // Store credentials
      await this.storeCredentials(jiraUrl, apiToken)
      
      // Fetch user data and projects
      console.log('👤 Fetching user data...')
      await this.fetchUserData()
      console.log('📚 Fetching projects...')
      await this.fetchProjectsData()
      
      this.isAuthenticated = true
      this.notifyAuthStateChange()
      
      console.log('✅ Jira authentication successful!')
      console.log('👤 User:', this.user?.displayName)
      console.log('📚 Projects count:', this.projects.length)
      return true
    } catch (error) {
      console.error('❌ Jira authentication error:', error)
      return false
    }
  }

  private async getJiraInstanceUrl(): Promise<string | null> {
    return new Promise((resolve) => {
      const url = prompt('Enter your Jira instance URL (e.g., https://yourcompany.atlassian.net):')
      if (url) {
        // Clean up the URL
        const cleanUrl = url.replace(/\/$/, '') // Remove trailing slash
        resolve(cleanUrl)
      } else {
        resolve(null)
      }
    })
  }

  private async getApiTokenFromUser(): Promise<string | null> {
    return new Promise((resolve) => {
      const token = prompt(
        'Enter your Jira API token:\n\n' +
        '1. Go to https://id.atlassian.com/manage-profile/security/api-tokens\n' +
        '2. Click "Create API token"\n' +
        '3. Copy and paste the token here:'
      )
      resolve(token)
    })
  }

  private async validateApiToken(baseUrl: string, apiToken: string): Promise<boolean> {
    try {
      const email = prompt('Enter your Jira account email:')
      if (!email) return false

      const auth = btoa(`${email}:${apiToken}`)
      const response = await fetch(`${baseUrl}/rest/api/3/myself`, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json'
        }
      })

      return response.ok
    } catch (error) {
      console.error('❌ Error validating API token:', error)
      return false
    }
  }

  private async storeCredentials(baseUrl: string, apiToken: string): Promise<void> {
    const email = prompt('Enter your Jira account email:')
    if (!email) throw new Error('Email is required')

    if (chrome.storage) {
      await chrome.storage.local.set({
        'jira_base_url': baseUrl,
        'jira_api_token': apiToken,
        'jira_email': email
      })
    } else {
      // Fallback to localStorage for non-extension environments
      localStorage.setItem('jira_base_url', baseUrl)
      localStorage.setItem('jira_api_token', apiToken)
      localStorage.setItem('jira_email', email)
    }
  }

  private async getStoredCredentials(): Promise<{baseUrl: string, apiToken: string, email: string} | null> {
    if (chrome.storage) {
      const result = await chrome.storage.local.get(['jira_base_url', 'jira_api_token', 'jira_email'])
      if (result.jira_base_url && result.jira_api_token && result.jira_email) {
        return {
          baseUrl: result.jira_base_url,
          apiToken: result.jira_api_token,
          email: result.jira_email
        }
      }
    } else {
      // Fallback to localStorage for non-extension environments
      const baseUrl = localStorage.getItem('jira_base_url')
      const apiToken = localStorage.getItem('jira_api_token')
      const email = localStorage.getItem('jira_email')
      
      if (baseUrl && apiToken && email) {
        return { baseUrl, apiToken, email }
      }
    }
    return null
  }

  private async fetchUserData(): Promise<void> {
    const credentials = await this.getStoredCredentials()
    if (!credentials) throw new Error('No stored credentials')

    const auth = btoa(`${credentials.email}:${credentials.apiToken}`)
    const response = await fetch(`${credentials.baseUrl}/rest/api/3/myself`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch user data')
    }

    const userData: JiraApiUser = await response.json()
    this.user = {
      accountId: userData.accountId,
      login: userData.emailAddress || userData.displayName,
      name: userData.displayName,
      displayName: userData.displayName,
      avatar_url: userData.avatarUrls['48x48'] || userData.avatarUrls['32x32'] || '',
      html_url: `${credentials.baseUrl}/people/${userData.accountId}`,
      emailAddress: userData.emailAddress,
      timeZone: userData.timeZone
    }
    this.baseUrl = credentials.baseUrl
  }

  private async fetchProjectsData(): Promise<JiraProject[]> {
    const credentials = await this.getStoredCredentials()
    if (!credentials) throw new Error('No stored credentials')

    const auth = btoa(`${credentials.email}:${credentials.apiToken}`)
    const response = await fetch(`${credentials.baseUrl}/rest/api/3/project`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch projects')
    }

    const projectsData: JiraApiProject[] = await response.json()
    this.projects = projectsData.map(project => ({
      id: project.id,
      key: project.key,
      name: project.name,
      full_name: `${project.key} - ${project.name}`,
      description: project.description,
      url: `${credentials.baseUrl}/browse/${project.key}`,
      projectTypeKey: project.projectTypeKey,
      projectCategory: project.projectCategory,
      lead: project.lead
    }))

    return this.projects
  }

  public async checkExistingAuth(): Promise<boolean> {
    try {
      const credentials = await this.getStoredCredentials()
      if (!credentials) {
        console.log('🔍 No stored Jira credentials found')
        return false
      }

      console.log('🔍 Found stored credentials, validating...')
      const isValid = await this.validateApiToken(credentials.baseUrl, credentials.apiToken)
      
      if (isValid) {
        console.log('✅ Stored Jira credentials are valid')
        await this.fetchUserData()
        await this.fetchProjectsData()
        this.isAuthenticated = true
        this.notifyAuthStateChange()
        return true
      } else {
        console.log('❌ Stored Jira credentials are invalid')
        await this.clearStoredCredentials()
        return false
      }
    } catch (error) {
      console.error('❌ Error checking existing Jira auth:', error)
      return false
    }
  }

  private async clearStoredCredentials(): Promise<void> {
    if (chrome.storage) {
      await chrome.storage.local.remove(['jira_base_url', 'jira_api_token', 'jira_email'])
    } else {
      // Fallback to localStorage for non-extension environments
      localStorage.removeItem('jira_base_url')
      localStorage.removeItem('jira_api_token')
      localStorage.removeItem('jira_email')
    }
  }

  public async logout(): Promise<void> {
    await this.clearStoredCredentials()
    this.isAuthenticated = false
    this.user = null
    this.projects = []
    this.baseUrl = null
    this.notifyAuthStateChange()
  }

  private notifyStateChange() {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(this.isActive)
    }
  }

  private notifyAuthStateChange() {
    this.onAuthStateChangeCallbacks.forEach(callback => {
      callback(this.isAuthenticated, this.user || undefined)
    })
  }

  public activate() {
    if (!this.isActive) {
      this.isActive = true
      this.notifyStateChange()
      console.log('✅ Jira mode activated')
    }
  }

  public deactivate() {
    if (this.isActive) {
      this.isActive = false
      this.notifyStateChange()
      console.log('⏹️ Jira mode deactivated')
    }
  }

  public toggle() {
    if (this.isActive) {
      this.deactivate()
    } else {
      this.activate()
    }
  }

  public isJiraModeActive(): boolean {
    return this.isActive
  }

  public isUserAuthenticated(): boolean {
    return this.isAuthenticated
  }

  public getUser(): JiraUser | null {
    return this.user
  }

  public getProjects(): Project[] {
    return this.projects
  }

  public async fetchProjects(): Promise<Project[]> {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated')
    }
    
    try {
      return await this.fetchProjectsData()
    } catch (error) {
      console.error('❌ Error fetching Jira projects:', error)
      throw error
    }
  }

  public onStateChange(callback: (isActive: boolean) => void) {
    this.onStateChangeCallback = callback
  }

  public onAuthStateChange(callback: (isAuthenticated: boolean, user?: JiraUser) => void) {
    this.onAuthStateChangeCallbacks.push(callback)
  }

  public cleanup() {
    this.deactivate()
    this.onStateChangeCallback = null
    this.onAuthStateChangeCallbacks = []
  }

  public async fetchIssues(projectKey: string): Promise<JiraIssue[]> {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated')
    }

    const credentials = await this.getStoredCredentials()
    if (!credentials) throw new Error('No stored credentials')

    try {
      const auth = btoa(`${credentials.email}:${credentials.apiToken}`)
      const jql = `project = ${projectKey} ORDER BY created DESC`
      
      const response = await fetch(
        `${credentials.baseUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=50`,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch issues: ${response.statusText}`)
      }

      const data = await response.json()
      return data.issues.map((issue: JiraApiIssue) => ({
        id: issue.id,
        key: issue.key,
        number: parseInt(issue.key.split('-')[1]), // Extract number from key like "PROJ-123"
        title: issue.fields.summary,
        url: `${credentials.baseUrl}/browse/${issue.key}`,
        fields: issue.fields,
        self: issue.self
      }))
    } catch (error) {
      console.error('❌ Error fetching Jira issues:', error)
      throw error
    }
  }

  public async createIssue(projectKey: string, title: string, body: string): Promise<string | null> {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated')
    }

    const credentials = await this.getStoredCredentials()
    if (!credentials) throw new Error('No stored credentials')

    try {
      const auth = btoa(`${credentials.email}:${credentials.apiToken}`)
      
      const issueData = {
        fields: {
          project: {
            key: projectKey
          },
          summary: title,
          description: {
            type: "doc",
            version: 1,
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: body
                  }
                ]
              }
            ]
          },
          issuetype: {
            name: "Task" // Default to Task, could be made configurable
          }
        }
      }

      const response = await fetch(`${credentials.baseUrl}/rest/api/3/issue`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(issueData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Failed to create issue: ${errorData.errors ? JSON.stringify(errorData.errors) : response.statusText}`)
      }

      const newIssue = await response.json()
      const issueUrl = `${credentials.baseUrl}/browse/${newIssue.key}`
      
      console.log('✅ Jira issue created successfully:', issueUrl)
      return issueUrl
    } catch (error) {
      console.error('❌ Error creating Jira issue:', error)
      throw error
    }
  }
}

// Export singleton instance
export const jiraModeManager = new JiraModeManager() 