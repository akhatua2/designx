import React from 'react'
import { Github, Slack, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react'

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

interface TasksListProps {
  tasks: Task[]
  loading: boolean
  error: string | null
  onUpdateTaskStatus: (taskId: string, status: string) => void
  onRefresh: () => void
}

const TasksList: React.FC<TasksListProps> = ({
  tasks,
  loading,
  error,
  onUpdateTaskStatus,
  onRefresh
}) => {
  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'github':
        return <Github size={12} />
      case 'slack':
        return <Slack size={12} />
      case 'jira':
        return <JiraIcon size={12} />
      default:
        return null
    }
  }

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'github':
        return '#238636'
      case 'slack':
        return '#611f69'
      case 'jira':
        return '#0052cc'
      default:
        return '#6b7280'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#f59e0b'
      case 'in_progress':
        return '#3b82f6'
      case 'completed':
        return '#10b981'
      case 'cancelled':
        return '#6b7280'
      default:
        return '#6b7280'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return '#10b981'
      case 'medium':
        return '#f59e0b'
      case 'high':
        return '#f97316'
      case 'critical':
        return '#dc2626'
      default:
        return '#6b7280'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return 'Today'
    if (diffDays === 2) return 'Yesterday'
    if (diffDays <= 7) return `${diffDays - 1} days ago`
    
    return date.toLocaleDateString()
  }

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'pending':
        return 'in_progress'
      case 'in_progress':
        return 'completed'
      case 'completed':
        return 'pending'
      case 'cancelled':
        return 'pending'
      default:
        return 'pending'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending'
      case 'in_progress':
        return 'In Progress'
      case 'completed':
        return 'Completed'
      case 'cancelled':
        return 'Cancelled'
      default:
        return status
    }
  }

  // Simple Jira icon component
  const JiraIcon = ({ size = 12 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987s11.987-5.367 11.987-11.987C24.004 5.367 18.637.001 12.017.001zm-.008 21.347c-5.157 0-9.36-4.202-9.36-9.36 0-5.157 4.203-9.36 9.36-9.36s9.36 4.203 9.36 9.36c0 5.158-4.203 9.36-9.36 9.36z"/>
      <path d="M12.017 4.422L8.78 7.659l3.237 3.237 3.237-3.237z" fill="#2684FF"/>
      <path d="M12.017 12.776l3.237 3.237-3.237 3.237-3.237-3.237z"/>
    </svg>
  )

  const taskItemStyles = {
    padding: '10px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: '8px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    transition: 'all 0.2s ease'
  }

  const taskHeaderStyles = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '6px'
  }

  const platformBadgeStyles = (platform: string) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '9px',
    fontWeight: '500',
    backgroundColor: getPlatformColor(platform),
    color: 'white'
  })

  const statusBadgeStyles = (status: string) => ({
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '9px',
    fontWeight: '500',
    backgroundColor: getStatusColor(status),
    color: 'white',
    cursor: 'pointer',
    transition: 'opacity 0.2s ease'
  })

  const priorityDotStyles = (priority: string) => ({
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: getPriorityColor(priority),
    flexShrink: 0
  })

  const taskContentStyles = {
    fontSize: '11px',
    color: 'white',
    marginBottom: '8px',
    lineHeight: '1.4'
  }

  const taskMetaStyles = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '9px',
    color: 'rgba(255, 255, 255, 0.6)'
  }

  const taskActionsStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }

  const externalLinkStyles = {
    color: 'rgba(255, 255, 255, 0.6)',
    cursor: 'pointer',
    transition: 'color 0.2s ease'
  }

  if (loading) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '20px', 
        color: 'rgba(255, 255, 255, 0.5)', 
        fontSize: '10px' 
      }}>
        Loading tasks...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '20px', 
        color: '#dc2626', 
        fontSize: '10px' 
      }}>
        <div style={{ marginBottom: '8px' }}>
          <AlertCircle size={16} />
        </div>
        <div>{error}</div>
        <button
          onClick={onRefresh}
          style={{
            marginTop: '8px',
            padding: '4px 8px',
            borderRadius: '4px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: 'white',
            fontSize: '9px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            margin: '8px auto 0'
          }}
        >
          <RefreshCw size={10} />
          Retry
        </button>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '20px', 
        color: 'rgba(255, 255, 255, 0.5)', 
        fontSize: '10px' 
      }}>
        No tasks yet. Create your first task by adding a comment to any element on the page!
      </div>
    )
  }

  return (
    <div>
      {tasks.map((task) => (
        <div
          key={task.id}
          style={taskItemStyles}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
          }}
        >
          <div style={taskHeaderStyles}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={priorityDotStyles(task.priority)} />
              <div style={platformBadgeStyles(task.platform)}>
                {getPlatformIcon(task.platform)}
                {task.platform.charAt(0).toUpperCase() + task.platform.slice(1)}
              </div>
            </div>
            <div
              style={statusBadgeStyles(task.status)}
              onClick={() => onUpdateTaskStatus(task.id, getNextStatus(task.status))}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              title={`Click to change status from ${getStatusLabel(task.status)} to ${getStatusLabel(getNextStatus(task.status))}`}
            >
              {getStatusLabel(task.status)}
            </div>
          </div>
          
          <div style={taskContentStyles}>
            {task.comment_text.length > 120 
              ? `${task.comment_text.substring(0, 120)}...` 
              : task.comment_text
            }
          </div>
          
          {/* Screenshots */}
          {task.screenshots && task.screenshots.length > 0 && (
            <div style={{
              display: 'flex',
              gap: '4px',
              marginBottom: '8px',
              flexWrap: 'wrap'
            }}>
              {task.screenshots.slice(0, 3).map((screenshot, index) => (
                <img
                  key={screenshot.id}
                  src={screenshot.upload_url}
                  alt={`Screenshot ${index + 1}`}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '4px',
                    objectFit: 'cover',
                    cursor: 'pointer',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                  onClick={() => window.open(screenshot.upload_url, '_blank')}
                  title={`Click to view full screenshot (${screenshot.filename})`}
                />
              ))}
              {task.screenshots.length > 3 && (
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  color: 'rgba(255, 255, 255, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  +{task.screenshots.length - 3}
                </div>
              )}
            </div>
          )}
          
          <div style={taskMetaStyles}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{formatDate(task.created_at)}</span>
              {task.element_info && (
                <span style={{ 
                  fontFamily: 'monospace',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  padding: '1px 4px',
                  borderRadius: '2px',
                  fontSize: '8px'
                }}>
                  {task.element_info.length > 20 
                    ? `${task.element_info.substring(0, 20)}...`
                    : task.element_info
                  }
                </span>
              )}
            </div>
            
                         <div style={taskActionsStyles}>
               {task.page_url && (
                 <div
                   style={externalLinkStyles}
                   onClick={() => window.open(task.page_url, '_blank')}
                   onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)'}
                   onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'}
                   title="Open page where task was created"
                 >
                   <ExternalLink size={10} />
                 </div>
               )}
              {task.external_url && (
                <div
                  style={{ ...externalLinkStyles, fontSize: '8px', textDecoration: 'underline' }}
                  onClick={() => window.open(task.external_url, '_blank')}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'}
                >
                  {task.platform === 'github' ? 'Issue' : 
                   task.platform === 'jira' ? 'Ticket' : 'Message'}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default TasksList 