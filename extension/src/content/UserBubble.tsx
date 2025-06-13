import React, { useState, useEffect } from 'react'
import { X, User, CheckCircle, Clock, AlertCircle, LogOut } from 'lucide-react'
import TasksList from './TasksList'

interface Screenshot {
  id: string
  filename: string
  upload_url: string
  file_size?: number
  content_type: string
  created_at: string
}

interface Task {
  id: string
  comment_text: string
  platform: 'github' | 'slack' | 'jira'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'critical'
  element_info?: string
  dom_path?: string
  page_url?: string
  external_id?: string
  external_url?: string
  metadata: any
  screenshots?: Screenshot[]
  created_at: string
  updated_at: string
}

interface UserBubbleProps {
  isVisible: boolean
  user: any // Google user object
  onClose: () => void
  onLogout?: () => void
}

const UserBubble: React.FC<UserBubbleProps> = ({ 
  isVisible,
  user,
  onClose,
  onLogout
}) => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch user tasks when bubble becomes visible
  useEffect(() => {
    if (isVisible && user) {
      fetchTasks()
    }
  }, [isVisible, user])

  const fetchTasks = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Get the stored auth token (using the correct key from GoogleAuthManager)
      const token = localStorage.getItem('google_auth_token') || sessionStorage.getItem('google_auth_token')
      
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch('https://designx-705035175306.us-central1.run.app/api/tasks', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.statusText}`)
      }

      const fetchedTasks = await response.json()
      setTasks(fetchedTasks)
    } catch (err) {
      console.error('Error fetching tasks:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks')
    } finally {
      setLoading(false)
    }
  }

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      const token = localStorage.getItem('google_auth_token') || sessionStorage.getItem('google_auth_token')
      
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch(`https://designx-705035175306.us-central1.run.app/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      })

      if (!response.ok) {
        throw new Error(`Failed to update task: ${response.statusText}`)
      }

      const updatedTask = await response.json()
      
      // Update the local state
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? updatedTask : task
        )
      )
    } catch (err) {
      console.error('Error updating task:', err)
      setError(err instanceof Error ? err.message : 'Failed to update task')
    }
  }

  const handleLogout = () => {
    // Clear authentication tokens (using correct keys)
    localStorage.removeItem('google_auth_token')
    localStorage.removeItem('google_user')
    sessionStorage.removeItem('google_auth_token')
    sessionStorage.removeItem('google_user')
    
    // Call parent logout handler if provided
    if (onLogout) {
      onLogout()
    }
    
    // Close the bubble
    onClose()
  }

  if (!isVisible) return null

  const bubbleStyles = {
    position: 'fixed' as const,
    bottom: '72px',
    right: '20px',
    width: '400px',
    maxHeight: '500px',
    borderRadius: '24px',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    color: 'white',
    padding: '10px',
    zIndex: 10000,
    animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
    pointerEvents: 'auto' as const,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const
  }

  const headerStyles = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    flexShrink: 0
  }

  const titleStyles = {
    fontSize: '12px',
    fontWeight: '600',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }

  const closeButtonStyles = {
    background: 'none',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.6)',
    cursor: 'pointer',
    padding: '2px',
    borderRadius: '4px',
    transition: 'color 0.2s ease'
  }

  const userInfoStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    marginBottom: '12px',
    flexShrink: 0
  }

  const avatarStyles = {
    width: '32px',
    height: '32px',
    borderRadius: '50%'
  }

  const userTextStyles = {
    display: 'flex',
    flexDirection: 'column' as const,
    flex: 1
  }

  const logoutButtonStyles = {
    background: 'none',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.6)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    transition: 'color 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '10px'
  }

  const userNameStyles = {
    fontSize: '12px',
    fontWeight: '500',
    color: 'white'
  }

  const userEmailStyles = {
    fontSize: '10px',
    color: 'rgba(255, 255, 255, 0.6)'
  }

  const statsStyles = {
    display: 'flex',
    gap: '12px',
    marginBottom: '12px',
    fontSize: '10px',
    flexShrink: 0
  }

  const statItemStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    borderRadius: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)'
  }

  const contentStyles = {
    flex: 1,
    overflow: 'auto',
    maxHeight: '350px'
  }

  const getTaskStats = () => {
    const pending = tasks.filter(t => t.status === 'pending').length
    const inProgress = tasks.filter(t => t.status === 'in_progress').length  
    const completed = tasks.filter(t => t.status === 'completed').length
    
    return { pending, inProgress, completed }
  }

  const stats = getTaskStats()

  return (
    <>
      <style>
        {`
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
      <div style={bubbleStyles} data-floating-icon="true">
        <div style={headerStyles}>
          <div style={titleStyles}>
            <User size={16} />
            My Tasks
          </div>
          <button
            onClick={onClose}
            style={closeButtonStyles}
            onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'}
          >
            <X size={12} />
          </button>
        </div>

        {/* User Info */}
        <div style={userInfoStyles}>
          <img 
            src={user?.picture} 
            alt={user?.name} 
            style={avatarStyles}
          />
          <div style={userTextStyles}>
            <div style={userNameStyles}>{user?.name}</div>
            <div style={userEmailStyles}>{user?.email}</div>
          </div>
          <button
            onClick={handleLogout}
            style={logoutButtonStyles}
            title="Logout"
            onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'}
          >
            <LogOut size={12} />
          </button>
        </div>

        {/* Task Stats */}
        <div style={statsStyles}>
          <div style={statItemStyles}>
            <Clock size={10} style={{ color: '#f59e0b' }} />
            <span style={{ color: '#f59e0b' }}>{stats.pending}</span>
            <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Pending</span>
          </div>
          <div style={statItemStyles}>
            <AlertCircle size={10} style={{ color: '#3b82f6' }} />
            <span style={{ color: '#3b82f6' }}>{stats.inProgress}</span>
            <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>In Progress</span>
          </div>
          <div style={statItemStyles}>
            <CheckCircle size={10} style={{ color: '#10b981' }} />
            <span style={{ color: '#10b981' }}>{stats.completed}</span>
            <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Done</span>
          </div>
        </div>

        {/* Tasks List */}
        <div style={contentStyles}>
          <TasksList
            tasks={tasks}
            loading={loading}
            error={error}
            onUpdateTaskStatus={updateTaskStatus}
            onRefresh={fetchTasks}
          />
        </div>
      </div>
    </>
  )
}

export default UserBubble 