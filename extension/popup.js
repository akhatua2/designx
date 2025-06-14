document.addEventListener('DOMContentLoaded', () => {
  const startRecordingBtn = document.getElementById('startRecording')
  
  startRecordingBtn.addEventListener('click', async () => {
    try {
      startRecordingBtn.textContent = '🎬 Starting...'
      startRecordingBtn.disabled = true
      
      // Generate session ID
      const sessionId = `popup_recording_${Date.now()}`
      
      // Start recording directly via background script
      const response = await chrome.runtime.sendMessage({
        action: 'startTabCapture',
        sessionId: sessionId
      })
      
      if (response && response.success) {
        startRecordingBtn.textContent = '✅ Recording Started!'
        startRecordingBtn.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
        
        // Close popup after short delay
        setTimeout(() => {
          window.close()
        }, 1000)
      } else {
        throw new Error(response?.error || 'Failed to start recording')
      }
      
    } catch (error) {
      console.error('❌ Popup recording failed:', error)
      startRecordingBtn.textContent = '❌ Failed to start'
      startRecordingBtn.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
      
      setTimeout(() => {
        startRecordingBtn.textContent = '🎬 Start Tab Recording'
        startRecordingBtn.style.background = 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
        startRecordingBtn.disabled = false
      }, 2000)
    }
  })
}) 