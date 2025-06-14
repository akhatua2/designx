import React, { useState, useEffect } from 'react'
import { Video, Square, Circle, Clock } from 'lucide-react'

interface RecordingControlsProps {
  onRecordingUploaded: (recordingUrl: string) => void
  disabled?: boolean
}

const RecordingControls: React.FC<RecordingControlsProps> = ({
  onRecordingUploaded,
  disabled = false
}) => {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSessionId, setRecordingSessionId] = useState<string | null>(null)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Update duration timer
  useEffect(() => {
    let interval: number | null = null

    if (isRecording && recordingStartTime) {
      interval = setInterval(() => {
        setRecordingDuration(Date.now() - recordingStartTime)
      }, 1000)
    } else {
      setRecordingDuration(0)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRecording, recordingStartTime])

  // Listen for recording completion from background script
  useEffect(() => {
    const handleRecordingUploaded = (event: CustomEvent) => {
      const { sessionId, videoUrl, filename, localSave } = event.detail
      if (sessionId === recordingSessionId) {
        if (localSave) {
          console.log('✅ Recording saved locally:', filename)
        } else {
          console.log('✅ Recording uploaded:', videoUrl)
          onRecordingUploaded(videoUrl)
        }
        
        // Reset state
        setIsRecording(false)
        setRecordingSessionId(null)
        setRecordingDuration(0)
        setRecordingStartTime(null)
        setIsProcessing(false)
      }
    }

    const handleRecordingFailed = (event: CustomEvent) => {
      const { sessionId, error } = event.detail
      if (sessionId === recordingSessionId) {
        setError(error || 'Recording failed')
        setIsRecording(false)
        setRecordingSessionId(null)
        setRecordingDuration(0)
        setRecordingStartTime(null)
        setIsProcessing(false)
      }
    }

    window.addEventListener('recordingUploaded' as any, handleRecordingUploaded)
    window.addEventListener('recordingFailed' as any, handleRecordingFailed)
    return () => {
      window.removeEventListener('recordingUploaded' as any, handleRecordingUploaded)
      window.removeEventListener('recordingFailed' as any, handleRecordingFailed)
    }
  }, [recordingSessionId, onRecordingUploaded])

  const handleStartRecording = async () => {
    try {
      setError(null)
      console.log('🎬 Starting background recording...')
      
      // Generate session ID
      const sessionId = `recording_${Date.now()}`
      
      // Start recording via background script
      const response = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage({
          action: 'startTabCapture',
          sessionId: sessionId
        }, resolve)
      })
      
      if (response && response.success) {
        setIsRecording(true)
        setRecordingSessionId(sessionId)
        setRecordingStartTime(Date.now())
        console.log('✅ Background recording started successfully')
      } else {
        setError(response?.error || 'Failed to start recording')
        console.error('❌ Failed to start recording:', response?.error)
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setError(errorMsg)
      console.error('❌ Recording error:', error)
    }
  }

  const handleStopRecording = async () => {
    if (!recordingSessionId) return

    try {
      setIsProcessing(true)
      console.log('🛑 Stopping background recording...')
      
      // Stop recording via background script
      const response = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage({
          action: 'stopTabCapture',
          sessionId: recordingSessionId
        }, resolve)
      })
      
      if (response && response.success) {
        console.log('✅ Recording stop initiated')
        // Note: actual completion will be handled by the recordingUploaded event
      } else {
        setError(response?.error || 'Failed to stop recording')
        console.error('❌ Failed to stop recording:', response?.error)
        setIsProcessing(false)
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setError(errorMsg)
      console.error('❌ Stop recording error:', error)
      setIsProcessing(false)
    }
  }

  const handleCancelRecording = async () => {
    if (!recordingSessionId) return

    try {
      // Stop recording via background script (same as stop, but don't wait for upload)
      await chrome.runtime.sendMessage({
        action: 'stopTabCapture',
        sessionId: recordingSessionId
      })
      
      // Reset state immediately for cancel
      setIsRecording(false)
      setRecordingSessionId(null)
      setRecordingDuration(0)
      setRecordingStartTime(null)
      setIsProcessing(false)
      console.log('🗑️ Recording cancelled')
    } catch (error) {
      console.error('❌ Cancel recording error:', error)
    }
  }

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const containerStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 8px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: isRecording ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
    transition: 'all 0.2s ease'
  }

  const buttonStyles = (variant: 'start' | 'stop' | 'cancel') => {
    const baseStyles = {
      padding: '4px 8px',
      borderRadius: '6px',
      border: 'none',
      fontSize: '10px',
      fontWeight: '500',
      cursor: disabled || isProcessing ? 'not-allowed' : 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      transition: 'all 0.2s ease',
      opacity: disabled || isProcessing ? 0.6 : 1
    }

    switch (variant) {
      case 'start':
        return {
          ...baseStyles,
          backgroundColor: '#22c55e',
          color: 'white'
        }
      case 'stop':
        return {
          ...baseStyles,
          backgroundColor: '#ef4444',
          color: 'white'
        }
      case 'cancel':
        return {
          ...baseStyles,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          color: 'rgba(255, 255, 255, 0.7)'
        }
      default:
        return baseStyles
    }
  }

  const durationStyles = {
    fontSize: '10px',
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'monospace',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  }

  const errorStyles = {
    fontSize: '9px',
    color: '#ef4444',
    marginTop: '4px',
    textAlign: 'center' as const
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={containerStyles}>
        {!isRecording ? (
          <button
            onClick={handleStartRecording}
            disabled={disabled || isProcessing}
            style={buttonStyles('start')}
            title="Start screen recording"
          >
            <Video size={12} />
            Start Recording
          </button>
        ) : (
          <>
            <div style={durationStyles}>
              <Circle size={8} fill="#ef4444" color="#ef4444" />
              <Clock size={10} />
              {formatDuration(recordingDuration)}
            </div>
            
            <button
              onClick={handleStopRecording}
              disabled={isProcessing}
              style={buttonStyles('stop')}
              title="Stop and save recording"
            >
              <Square size={12} />
              {isProcessing ? 'Processing...' : 'Stop'}
            </button>
            
            <button
              onClick={handleCancelRecording}
              disabled={isProcessing}
              style={buttonStyles('cancel')}
              title="Cancel recording"
            >
              ✕
            </button>
          </>
        )}
      </div>
      
      {error && (
        <div style={errorStyles}>
          {error}
        </div>
      )}
    </div>
  )
}

export default RecordingControls 