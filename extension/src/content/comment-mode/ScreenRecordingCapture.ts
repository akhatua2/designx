export interface RecordingOptions {
  element?: Element
  quality?: 'low' | 'medium' | 'high'
  videoBitsPerSecond?: number
  audioBitsPerSecond?: number
  mimeType?: string
  maxDuration?: number // in seconds
}

export interface RecordingResult {
  success: boolean
  videoUrl?: string
  duration?: number
  size?: number
  error?: string
}

export interface RecordingSession {
  id: string
  isRecording: boolean
  startTime: number
  duration: number
  mediaRecorder?: MediaRecorder
  stream?: MediaStream
}

export class ScreenRecordingCapture {
  private static readonly API_BASE = 'https://designx-705035175306.us-central1.run.app'
  private static sessions: Map<string, RecordingSession> = new Map()
  private static recordingCounter = 0

  // Set up message listener for popup requests
  static {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.action === 'startRecordingFromPopup') {
        this.handlePopupRecordingRequest(sendResponse)
        return true // Required for async response
      }
      
      if (message.action === 'recordingComplete') {
        this.handleRecordingComplete(message)
        return true
      }
      
      if (message.action === 'recordingStreamId') {
        this.handleStreamIdRecording(message)
        return true
      }
      
      if (message.action === 'recordingStatus') {
        console.log('🎬 Recording status:', message.status, '-', message.message)
        return true
      }
    })
  }

  private static async handlePopupRecordingRequest(sendResponse: (response: any) => void) {
    try {
      console.log('🎬 Popup recording request received')
      
      // Generate session ID
      const sessionId = `content_recording_${Date.now()}`
      
      // Create a minimal session for tracking
      const session: RecordingSession = {
        id: sessionId,
        isRecording: true,
        startTime: Date.now(),
        duration: 0
      }
      
      this.sessions.set(sessionId, session)
      
      // Start recording via background script
      const response = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage({
          action: 'startTabCapture',
          sessionId: sessionId
        }, resolve)
      })
      
      if (response.success) {
        console.log('✅ Background recording started successfully')
        sendResponse({ success: true, sessionId: sessionId })
      } else {
        console.error('❌ Background recording failed:', response.error)
        this.sessions.delete(sessionId)
        sendResponse({ success: false, error: response.error })
      }
      
    } catch (error) {
      console.error('❌ Popup recording failed:', error)
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
    }
  }

  private static async handleRecordingComplete(message: any) {
    try {
      console.log('🎬 Recording complete message received:', message.sessionId)
      
      const session = this.sessions.get(message.sessionId)
      if (!session) {
        console.warn('❌ No session found for completed recording:', message.sessionId)
        return
      }
      
      // Update session
      session.isRecording = false
      session.duration = Date.now() - session.startTime
      
      if (message.success) {
        if (message.localSave) {
          console.log('✅ Recording saved locally:', message.filename)
          
          // Notify any listeners (e.g., RecordingControls component)
          window.dispatchEvent(new CustomEvent('recordingUploaded', {
            detail: { 
              sessionId: message.sessionId, 
              filename: message.filename,
              duration: session.duration,
              localSave: true
            }
          }))
        } else {
          // Handle cloud upload (old logic for when we switch back)
          const response = await fetch(message.videoData)
          const videoBlob = await response.blob()
          
          console.log('📦 Video blob created from background recording:', {
            size: videoBlob.size,
            type: message.mimeType
          })
          
          // Store blob in session for later retrieval
          ;(session as any).videoBlob = videoBlob
          
          // Auto-upload to backend
          const videoUrl = await this.uploadRecording(videoBlob, message.sessionId)
          if (videoUrl) {
            console.log('✅ Background recording completed and uploaded:', videoUrl)
            
            // Notify any listeners (e.g., RecordingControls component)
            window.dispatchEvent(new CustomEvent('recordingUploaded', {
              detail: { sessionId: message.sessionId, videoUrl, duration: session.duration, size: videoBlob.size }
            }))
          }
        }
      } else {
        console.error('❌ Recording failed:', message.error)
        
        // Notify listeners of failure
        window.dispatchEvent(new CustomEvent('recordingFailed', {
          detail: { sessionId: message.sessionId, error: message.error }
        }))
      }
      
      // Clean up session
      this.sessions.delete(message.sessionId)
      
    } catch (error) {
      console.error('❌ Failed to handle recording completion:', error)
    }
  }

  private static async handleStreamIdRecording(message: any) {
    try {
      console.log('🎬 Content: Received stream ID for recording:', message.streamId)
      
      const { streamId, sessionId } = message
      
      // Get session if it exists
      let session = this.sessions.get(sessionId)
      if (!session) {
        // Create new session
        session = {
          id: sessionId,
          isRecording: true,
          startTime: Date.now(),
          duration: 0
        }
        this.sessions.set(sessionId, session)
      }
      
      // Use getUserMedia with the stream ID
      const constraints = {
        audio: {
          mandatory: {
            chromeMediaSource: "tab",
            chromeMediaSourceId: streamId,
          }
        },
        video: {
          mandatory: {
            chromeMediaSource: "tab",
            chromeMediaSourceId: streamId,
          }
        }
      }
      
      console.log('🔧 Content: Using getUserMedia with constraints:', constraints)
      const stream = await navigator.mediaDevices.getUserMedia(constraints as any)
      
      console.log('📺 Content: Stream obtained successfully')
      
      // Determine the best MIME type
      const supportedMimeType = this.getBestMimeType()
      if (!supportedMimeType) {
        throw new Error('No supported video MIME type found')
      }
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: supportedMimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps
        audioBitsPerSecond: 96000    // 96 kbps
      })
      
      const chunks: Blob[] = []
      
      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }
      
      mediaRecorder.onstop = async () => {
        console.log('🎬 Content: Recording stopped, processing...')
        session!.isRecording = false
        session!.duration = Date.now() - session!.startTime
        
        // Create video blob
        const videoBlob = new Blob(chunks, { type: supportedMimeType })
        console.log('📦 Content: Video blob created:', {
          size: videoBlob.size,
          type: videoBlob.type,
          duration: session!.duration
        })
        
        // Stop all tracks
        stream.getTracks().forEach((track: MediaStreamTrack) => track.stop())
        
        // Save locally using downloads API
        this.saveRecordingLocally(videoBlob, sessionId, supportedMimeType)
      }
      
      mediaRecorder.onerror = (event) => {
        console.error('❌ Content: MediaRecorder error:', event)
        this.stopRecording(sessionId)
      }
      
      // Handle user stopping screen share
      stream.getVideoTracks()[0].onended = () => {
        console.log('🛑 Content: User stopped screen sharing')
        this.stopRecording(sessionId)
      }
      
      // Update session with recorder and stream
      session.mediaRecorder = mediaRecorder
      session.stream = stream
      
      // Start recording
      mediaRecorder.start(1000) // Collect data every second
      
      console.log('✅ Content: Recording started successfully with session:', sessionId)
      
      // Notify UI
      window.dispatchEvent(new CustomEvent('recordingStarted', {
        detail: { sessionId: sessionId }
      }))
      
    } catch (error) {
      console.error('❌ Content: Failed to start recording with stream ID:', error)
      
      // Notify UI of failure
      window.dispatchEvent(new CustomEvent('recordingFailed', {
        detail: { sessionId: message.sessionId, error: error instanceof Error ? error.message : 'Unknown error' }
      }))
    }
  }

  private static async saveRecordingLocally(blob: Blob, sessionId: string, _mimeType: string) {
    try {
      // Convert blob to data URL
      const reader = new FileReader()
      reader.onload = async () => {
        const dataUrl = reader.result as string
        
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const filename = `screen-recording-${timestamp}.webm`
        
        // Download the file
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        
        console.log('✅ Content: Recording saved locally:', filename)
        
        // Notify UI
        window.dispatchEvent(new CustomEvent('recordingUploaded', {
          detail: { 
            sessionId: sessionId, 
            filename: filename,
            localSave: true,
            success: true
          }
        }))
      }
      
      reader.onerror = () => {
        console.error('❌ Content: Failed to read blob for download')
        window.dispatchEvent(new CustomEvent('recordingFailed', {
          detail: { sessionId: sessionId, error: 'Failed to process recording for download' }
        }))
      }
      
      reader.readAsDataURL(blob)
      
    } catch (error) {
      console.error('❌ Content: Failed to save recording locally:', error)
      window.dispatchEvent(new CustomEvent('recordingFailed', {
        detail: { sessionId: sessionId, error: 'Failed to save recording locally' }
      }))
    }
  }

  /**
   * Start screen recording
   */
  static async startRecording(options: RecordingOptions = {}): Promise<{ success: boolean; sessionId?: string; error?: string }> {
    try {
      console.log('🎬 Starting screen recording...')

      const {
        quality = 'medium',
        videoBitsPerSecond,
        audioBitsPerSecond,
        mimeType,
        maxDuration = 300 // 5 minutes default
      } = options

      // Generate session ID
      const sessionId = `recording_${++this.recordingCounter}_${Date.now()}`

      // Get quality settings
      const qualitySettings = this.getQualitySettings(quality)

      // Ensure extension is invoked first for tabCapture
      const streamIdResponse = await new Promise<any>((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'ensureInvokedAndGetStreamId'
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else {
            resolve(response)
          }
        })
      })

      if (!streamIdResponse.success) {
        console.error('❌ Failed to get stream ID:', streamIdResponse.error)
        throw new Error(streamIdResponse.error || 'Failed to get stream ID')
      }
      
      console.log('✅ Stream ID received:', streamIdResponse.streamId)

      // Use the stream ID to get the actual MediaStream for current tab
      const constraints = {
        audio: {
          mandatory: {
            chromeMediaSource: "tab",
            chromeMediaSourceId: streamIdResponse.streamId,
          }
        },
        video: {
          mandatory: {
            chromeMediaSource: "tab",
            chromeMediaSourceId: streamIdResponse.streamId,
          }
        }
      }
      
      console.log('🔧 Using getUserMedia with constraints:', constraints)
      const stream = await navigator.mediaDevices.getUserMedia(constraints as any)

      console.log('📺 Tab capture stream obtained')

      // Determine the best MIME type
      const supportedMimeType = mimeType || this.getBestMimeType()
      
      if (!supportedMimeType) {
        throw new Error('No supported video MIME type found')
      }

      // Create MediaRecorder
      const mediaRecorderOptions: MediaRecorderOptions = {
        mimeType: supportedMimeType,
        videoBitsPerSecond: videoBitsPerSecond || qualitySettings.videoBitsPerSecond,
        audioBitsPerSecond: audioBitsPerSecond || qualitySettings.audioBitsPerSecond
      }

      const mediaRecorder = new MediaRecorder(stream, mediaRecorderOptions)
      const chunks: Blob[] = []

      // Create session
      const session: RecordingSession = {
        id: sessionId,
        isRecording: true,
        startTime: Date.now(),
        duration: 0,
        mediaRecorder,
        stream
      }

      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        console.log('🎬 Recording stopped, processing...')
        session.isRecording = false
        session.duration = Date.now() - session.startTime

        // Create video blob
        const videoBlob = new Blob(chunks, { type: supportedMimeType })
        console.log('📦 Video blob created:', {
          size: videoBlob.size,
          type: videoBlob.type,
          duration: session.duration
        })

        // Stop all tracks
        stream.getTracks().forEach((track: MediaStreamTrack) => track.stop())

        // Store blob in session for later retrieval
        ;(session as any).videoBlob = videoBlob
      }

      mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event)
        this.stopRecording(sessionId)
      }

      // Handle user stopping screen share
      stream.getVideoTracks()[0].onended = () => {
        console.log('🛑 User stopped screen sharing')
        this.stopRecording(sessionId)
      }

      // Set up auto-stop timer
      if (maxDuration > 0) {
        setTimeout(() => {
          if (this.sessions.get(sessionId)?.isRecording) {
            console.log(`⏰ Auto-stopping recording after ${maxDuration} seconds`)
            this.stopRecording(sessionId)
          }
        }, maxDuration * 1000)
      }

      // Start recording
      mediaRecorder.start(1000) // Collect data every second
      this.sessions.set(sessionId, session)

      console.log(`✅ Recording started with session ID: ${sessionId}`)
      return { success: true, sessionId }

    } catch (error) {
      console.error('❌ Failed to start recording:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Stop screen recording and upload
   */
  static async stopRecording(sessionId: string): Promise<RecordingResult> {
    try {
      const session = this.sessions.get(sessionId)
      if (!session) {
        return { success: false, error: 'Recording session not found' }
      }

      if (!session.isRecording) {
        return { success: false, error: 'Recording is not active' }
      }

      console.log('🛑 Stopping recording...')

      // Stop MediaRecorder
      if (session.mediaRecorder && session.mediaRecorder.state !== 'inactive') {
        session.mediaRecorder.stop()
      }

      // Stop all tracks
      if (session.stream) {
        session.stream.getTracks().forEach(track => track.stop())
      }

      // Wait for the recording to be processed
      await new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (!session.isRecording && (session as any).videoBlob) {
            clearInterval(checkInterval)
            resolve(true)
          }
        }, 100)

        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkInterval)
          resolve(false)
        }, 10000)
      })

      const videoBlob = (session as any).videoBlob
      if (!videoBlob) {
        return { success: false, error: 'Failed to create video blob' }
      }

      // Upload to backend
      const videoUrl = await this.uploadRecording(videoBlob, sessionId)
      if (!videoUrl) {
        return { success: false, error: 'Failed to upload recording' }
      }

      // Clean up session
      this.sessions.delete(sessionId)

      console.log('✅ Recording completed and uploaded:', videoUrl)
      return {
        success: true,
        videoUrl,
        duration: session.duration,
        size: videoBlob.size
      }

    } catch (error) {
      console.error('❌ Failed to stop recording:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Get recording status
   */
  static getRecordingStatus(sessionId: string): { isRecording: boolean; duration: number } | null {
    const session = this.sessions.get(sessionId)
    if (!session) return null

    return {
      isRecording: session.isRecording,
      duration: session.isRecording ? Date.now() - session.startTime : session.duration
    }
  }

  /**
   * Cancel recording without saving
   */
  static cancelRecording(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false

    // Stop MediaRecorder
    if (session.mediaRecorder && session.mediaRecorder.state !== 'inactive') {
      session.mediaRecorder.stop()
    }

    // Stop all tracks
    if (session.stream) {
      session.stream.getTracks().forEach(track => track.stop())
    }

    // Clean up session
    this.sessions.delete(sessionId)

    console.log('🗑️ Recording cancelled:', sessionId)
    return true
  }

  /**
   * Get best supported MIME type
   */
  private static getBestMimeType(): string | null {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm',
      'video/mp4'
    ]

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type
      }
    }

    return null
  }

  /**
   * Get quality settings based on quality level
   */
  private static getQualitySettings(quality: 'low' | 'medium' | 'high') {
    switch (quality) {
      case 'low':
        return {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 15 },
          videoBitsPerSecond: 1000000, // 1 Mbps
          audioBitsPerSecond: 64000    // 64 kbps
        }
      case 'high':
        return {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
          videoBitsPerSecond: 5000000, // 5 Mbps
          audioBitsPerSecond: 128000   // 128 kbps
        }
      default: // medium
        return {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 24 },
          videoBitsPerSecond: 2500000, // 2.5 Mbps
          audioBitsPerSecond: 96000    // 96 kbps
        }
    }
  }

  /**
   * Upload recording to backend
   */
  private static async uploadRecording(blob: Blob, sessionId: string): Promise<string | null> {
    try {
      console.log('☁️ Uploading recording to backend...')

      // Get auth token
      const token = localStorage.getItem('google_auth_token') || sessionStorage.getItem('google_auth_token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      // Create form data
      const formData = new FormData()
      formData.append('video', blob, `recording-${sessionId}-${Date.now()}.webm`)

      // Upload via backend
      const response = await fetch(`${this.API_BASE}/api/upload/recording`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Upload failed: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      console.log('✅ Recording uploaded successfully:', result.url)
      
      return result.url

    } catch (error) {
      console.error('❌ Upload to backend failed:', error)
      return null
    }
  }

  /**
   * Format duration for display
   */
  static formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }
} 