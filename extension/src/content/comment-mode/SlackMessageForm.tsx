import React, { useState, useRef, useEffect } from 'react'
import { Send, Slack, ChevronDown } from 'lucide-react'
import type { SelectedElement } from './CommentModeManager'
import { slackModeManager } from '../integrations/slack'
import type { SlackChannel } from '../integrations/slack/SlackModeManager'

interface SlackMessageFormProps {
  selectedElement: SelectedElement
  comment: string
  onCommentChange: (comment: string) => void
  onSubmit: (comment: string) => void
  onKeyDown: (e: React.KeyboardEvent) => void
}

const SlackMessageForm: React.FC<SlackMessageFormProps> = ({
  selectedElement,
  comment,
  onCommentChange,
  onSubmit,
  onKeyDown
}) => {
  const [selectedChannel, setSelectedChannel] = useState<SlackChannel | null>(null)
  const [channels, setChannels] = useState<SlackChannel[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load channels when component mounts and when auth state changes
  useEffect(() => {
    const loadChannels = () => {
      if (slackModeManager.isUserAuthenticated()) {
        const slackChannels = slackModeManager.getProjects() as SlackChannel[]
        setChannels(slackChannels)
      } else {
        setChannels([])
        setSelectedChannel(null)
      }
    }

    loadChannels()
    slackModeManager.onAuthStateChange(loadChannels)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto-focus textarea
  useEffect(() => {
    if (textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [])

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto'
      // Calculate the new height based on content
      const newHeight = Math.max(35, Math.min(textarea.scrollHeight, 120)) // Min 35px, max 120px
      textarea.style.height = `${newHeight}px`
    }
  }, [comment])

  const handleSubmit = async () => {
    if (!comment.trim() || !selectedChannel) return

    setIsSending(true)
    try {
      const messageText = `${comment.trim()}\n\n` +
        `*Element Info:* \`${selectedElement.elementInfo}\`\n` +
        `*DOM Path:* \`${selectedElement.domPath}\``
      
      const messageTs = await slackModeManager.createIssue(selectedChannel.id, messageText, '')
      if (messageTs) {
        onSubmit(comment.trim())
      }
    } finally {
      setIsSending(false)
    }
  }

  const textareaStyles = {
    width: '100%',
    minHeight: '35px',
    maxHeight: '120px',
    height: '35px',
    padding: '2px 0',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'white',
    fontSize: '12px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    resize: 'none' as const,
    outline: 'none',
    marginBottom: '6px',
    overflowY: 'auto' as const
  }

  const buttonContainerStyles = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px'
  }

  const channelSelectorStyles = {
    position: 'relative' as const,
    flex: 1
  }

  const channelButtonStyles = {
    width: '100%',
    padding: '4px 8px',
    borderRadius: '12px',
    border: 'none',
    fontSize: '10px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: selectedChannel ? 'white' : 'rgba(255, 255, 255, 0.5)',
    transition: 'all 0.2s ease'
  }

  const dropdownStyles = {
    position: 'absolute' as const,
    bottom: '100%',
    left: '0',
    right: '0',
    marginBottom: '4px',
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    maxHeight: '200px',
    overflowY: 'auto' as const,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
  }

  const channelItemStyles = {
    padding: '6px 8px',
    fontSize: '10px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    color: 'rgba(255, 255, 255, 0.9)'
  }

  const submitButtonStyles = {
    padding: '4px 12px',
    borderRadius: '12px',
    border: 'none',
    fontSize: '10px',
    fontWeight: '500',
    cursor: comment.trim() && selectedChannel ? 'pointer' : 'not-allowed',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'all 0.2s ease',
    backgroundColor: comment.trim() && selectedChannel ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)',
    color: 'white',
    opacity: comment.trim() && selectedChannel ? 1 : 0.5
  }

  const getAuthPrompt = () => {
    return slackModeManager.isUserAuthenticated() ? 'Select channel' : 'Sign in to Slack to send messages'
  }

  return (
    <>
      <style>
        {`
          .channel-item:hover {
            background-color: rgba(255, 255, 255, 0.1);
          }
        `}
      </style>
      
      <textarea
        ref={textareaRef}
        value={comment}
        onChange={(e) => onCommentChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Send a message about this element..."
        style={textareaStyles}
        className="comment-textarea"
      />
      
      <div style={buttonContainerStyles}>
        <div style={channelSelectorStyles} ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={channelButtonStyles}
          >
            <Slack size={12} />
            {selectedChannel ? `#${selectedChannel.name}` : getAuthPrompt()}
            <ChevronDown size={12} />
          </button>

          {isDropdownOpen && (
            <div style={dropdownStyles}>
              {channels.length === 0 ? (
                <div style={{ ...channelItemStyles, cursor: 'default' }}>
                  No channels available
                </div>
              ) : (
                channels.map((channel) => (
                  <div
                    key={channel.id}
                    className="channel-item"
                    style={channelItemStyles}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setSelectedChannel(channel)
                      setIsDropdownOpen(false)
                    }}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                  >
                    #{channel.name}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!comment.trim() || !selectedChannel || isSending}
          style={submitButtonStyles}
        >
          <Send size={12} />
          {isSending ? 'Sending...' : 'Send Message'}
        </button>
      </div>
    </>
  )
}

export default SlackMessageForm 