import React, { useState } from 'react'
import { X, Lock, Hash, ArrowLeft, MessageCircle } from 'lucide-react'
import type { SlackUser, SlackChannel, SlackMessage } from './SlackModeManager'
import type { Project } from '../IntegrationManager'

interface SlackBubbleProps {
  isVisible: boolean
  isAuthenticated: boolean
  user: SlackUser | null
  channels: Project[]
  onClose: () => void
  onAuthenticate: () => void
  onLogout: () => void
  onSelectChannel: (channel: Project) => Promise<SlackMessage[]>
}

const SlackBubble: React.FC<SlackBubbleProps> = ({
  isVisible,
  isAuthenticated,
  user,
  channels,
  onClose,
  onAuthenticate,
  onLogout,
  onSelectChannel
}) => {
  const [selectedChannel, setSelectedChannel] = useState<Project | null>(null)
  const [messages, setMessages] = useState<SlackMessage[]>([])
  const [loading, setLoading] = useState(false)

  // Type guard to check if a Project is a SlackChannel
  const isSlackChannel = (channel: Project): channel is SlackChannel => {
    return 'is_private' in channel && 'is_channel' in channel && 'num_members' in channel
  }

  const handleChannelClick = async (channel: Project) => {
    setLoading(true)
    setSelectedChannel(channel)
    const fetchedMessages = await onSelectChannel(channel)
    setMessages(fetchedMessages)
    setLoading(false)
  }

  const handleBackClick = () => {
    setSelectedChannel(null)
    setMessages([])
  }

  if (!isVisible) return null

  const bubbleStyles = {
    position: 'fixed' as const,
    bottom: '72px',
    right: '20px',
    width: '360px',
    maxHeight: '400px',
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
    marginBottom: '8px',
    flexShrink: 0
  }

  const titleStyles = {
    fontSize: '12px',
    fontWeight: '600',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  }

  const contentStyles = {
    flex: 1,
    overflow: 'auto',
    maxHeight: '320px'
  }

  const authButtonStyles = {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    backgroundColor: '#4A154B', // Slack purple
    border: 'none',
    color: 'white',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px'
  }

  const channelItemStyles = {
    padding: '8px',
    borderRadius: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    border: '1px solid transparent'
  }

  const channelNameStyles = {
    fontSize: '11px',
    fontWeight: '500',
    color: 'white',
    marginBottom: '2px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  }

  const channelMetaStyles = {
    fontSize: '9px',
    color: 'rgba(255, 255, 255, 0.5)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }

  const messageItemStyles = {
    padding: '8px',
    borderRadius: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    border: '1px solid transparent'
  }

  const messageTextStyles = {
    fontSize: '11px',
    color: 'white',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const
  }

  const messageMetaStyles = {
    fontSize: '9px',
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: '4px'
  }

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
          
          .slack-channel-item:hover {
            background-color: rgba(255, 255, 255, 0.1) !important;
            border-color: rgba(255, 255, 255, 0.2) !important;
          }

          .slack-message-item:hover {
            background-color: rgba(255, 255, 255, 0.1) !important;
            border-color: rgba(255, 255, 255, 0.2) !important;
          }
        `}
      </style>
      <div style={bubbleStyles} data-floating-icon="true">
        <div style={headerStyles}>
          <div style={titleStyles}>
            {isAuthenticated && user ? (
              <>
                <img 
                  src={user.avatar_url} 
                  alt={user.name} 
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '3px'
                  }} 
                />
                <span>{user.name}</span>
              </>
            ) : (
              <>💬 Slack</>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isAuthenticated && (
              <button 
                onClick={onLogout}
                style={{
                  fontSize: '9px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.7)',
                  cursor: 'pointer'
                }}
              >
                Logout
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.6)',
                cursor: 'pointer',
                padding: '2px'
              }}
            >
              <X size={12} />
            </button>
          </div>
        </div>

        <div style={contentStyles}>
          {!isAuthenticated ? (
            <button onClick={onAuthenticate} style={authButtonStyles}>
              Connect to Slack
            </button>
          ) : selectedChannel ? (
            <>
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px', 
                  marginBottom: '12px',
                  fontSize: '10px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  cursor: 'pointer'
                }}
                onClick={handleBackClick}
              >
                <ArrowLeft size={12} />
                <span>Back to channels</span>
              </div>

              <div style={{ 
                fontSize: '11px', 
                fontWeight: '600',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <MessageCircle size={12} />
                Messages in {selectedChannel.full_name || selectedChannel.name}
              </div>

              {loading ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '20px', 
                  color: 'rgba(255, 255, 255, 0.5)', 
                  fontSize: '10px' 
                }}>
                  Loading messages...
                </div>
              ) : messages.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '20px', 
                  color: 'rgba(255, 255, 255, 0.5)', 
                  fontSize: '10px' 
                }}>
                  No messages found
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className="slack-message-item"
                    style={messageItemStyles}
                  >
                    <div style={messageTextStyles}>
                      {message.title}
                    </div>
                    <div style={messageMetaStyles}>
                      {new Date(Number(message.timestamp) * 1000).toLocaleString()}
                      {message.reactions?.length ? ` • ${message.reactions.length} reactions` : ''}
                    </div>
                  </div>
                ))
              )}
            </>
          ) : (
            <>
              <div style={{ fontSize: '10px', marginBottom: '6px', color: 'rgba(255, 255, 255, 0.6)' }}>
                Your Channels ({channels.length})
              </div>
              
              {channels.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '20px', 
                  color: 'rgba(255, 255, 255, 0.5)', 
                  fontSize: '10px' 
                }}>
                  No channels available
                </div>
              ) : (
                channels.map((channel) => {
                  const slackChannel = isSlackChannel(channel) ? channel : null
                  return (
                    <div
                      key={channel.id}
                      className="slack-channel-item"
                      style={channelItemStyles}
                      onClick={() => handleChannelClick(channel)}
                    >
                      <div style={channelNameStyles}>
                        {slackChannel?.is_private ? <Lock size={10} /> : <Hash size={10} />}
                        {channel.full_name || channel.name}
                      </div>
                      {channel.description && (
                        <div style={{
                          fontSize: '9px',
                          color: 'rgba(255, 255, 255, 0.6)',
                          marginBottom: '4px',
                          lineHeight: '1.3'
                        }}>
                          {channel.description.length > 80 
                            ? `${channel.description.substring(0, 80)}...` 
                            : channel.description
                          }
                        </div>
                      )}
                      {slackChannel && (
                        <div style={channelMetaStyles}>
                          <div>
                            {slackChannel.num_members} members
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default SlackBubble 