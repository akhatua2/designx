/**
 * Represents a generic project, which could be a GitHub repository, a Jira project, etc.
 */
export interface Project {
  id: string | number
  name: string
  full_name?: string // Optional, but useful for services like GitHub (e.g., "owner/repo")
  description: string | null
  url: string
}

/**
 * Represents a generic user profile.
 */
export interface UserProfile {
  login: string
  name: string
  avatar_url: string
  html_url: string
}

/**
 * Represents a generic issue or ticket.
 */
export interface Issue {
  id: string | number
  number: number
  title: string
  url: string
}

/**
 * Defines the standard contract for any integration (GitHub, Jira, etc.).
 * This allows the UI and business logic to interact with different services
 * in a consistent way.
 */
export interface IntegrationManager {
  readonly name: string; // e.g., "GitHub", "Jira"
  
  // --- State ---
  isUserAuthenticated(): boolean;

  // --- Authentication ---
  authenticate(): Promise<boolean>;
  logout(): Promise<void>;
  checkExistingAuth(): Promise<boolean>;
  onAuthStateChange(callback: (isAuthenticated: boolean, user?: UserProfile) => void): void;
  
  // --- Data Fetching ---
  getUser(): UserProfile | null;
  getProjects(): Project[]; // Returns locally cached projects
  fetchProjects(): Promise<Project[]>; // Actively fetches projects from the service
  fetchIssues(projectId: string | number): Promise<Issue[]>;
  
  // --- Actions ---
  createIssue(projectId: string | number, title: string, body: string): Promise<string | null>; // returns new issue URL

  // --- Lifecycle & UI Management ---
  // For integrations that have an active/inactive state in the UI
  activate?(): void;
  deactivate?(): void;
  onStateChange?(callback: (isActive: boolean) => void): void;
  cleanup(): void;
} 