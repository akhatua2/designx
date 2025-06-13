import html2canvas from 'html2canvas'

export interface ScreenshotOptions {
  element: Element
  padding?: number
  quality?: number
  format?: 'png' | 'jpeg'
}

export interface ScreenshotResult {
  success: boolean
  imageUrl?: string
  error?: string
}

export class ScreenshotCapture {
  private static readonly API_BASE = 'https://designx-705035175306.us-central1.run.app'

  /**
   * Capture a screenshot of the specified element
   */
  static async captureElement(options: ScreenshotOptions): Promise<ScreenshotResult> {
    const { element, padding = 10, quality = 0.8, format = 'png' } = options

    try {
      console.log('📸 Starting element screenshot capture...')

      // Get element position and dimensions
      const rect = element.getBoundingClientRect()
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft

      console.log('📐 Element dimensions:', {
        width: rect.width,
        height: rect.height,
        x: rect.x + scrollLeft,
        y: rect.y + scrollTop
      })

      // Scroll element into view if needed
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      
      // Wait a bit for scroll to complete
      await new Promise(resolve => setTimeout(resolve, 300))

      // Capture the specific element with padding
      const canvas = await html2canvas(element as HTMLElement, {
        backgroundColor: null, // Transparent background
        scale: 2, // Higher resolution
        logging: false,
        useCORS: true,
        allowTaint: true,
        width: rect.width + (padding * 2),
        height: rect.height + (padding * 2),
        x: -padding,
        y: -padding,
        scrollX: 0,
        scrollY: 0
      })

      console.log('📸 Canvas created:', {
        width: canvas.width,
        height: canvas.height
      })

      // Convert canvas to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, `image/${format}`, quality)
      })

      if (!blob) {
        return { success: false, error: 'Failed to create image blob' }
      }

      console.log('📦 Blob created:', {
        size: blob.size,
        type: blob.type
      })

      // Upload to Supabase
      const imageUrl = await this.uploadToSupabase(blob)
      if (!imageUrl) {
        return { success: false, error: 'Failed to upload image to storage' }
      }

      console.log('✅ Screenshot captured and uploaded:', imageUrl)
      return { success: true, imageUrl }

    } catch (error) {
      console.error('❌ Screenshot capture failed:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Upload blob to Supabase storage via our backend
   */
  private static async uploadToSupabase(blob: Blob): Promise<string | null> {
    try {
      console.log('☁️ Uploading image to Supabase storage...')

      // Get auth token
      const token = localStorage.getItem('google_auth_token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      // Create form data
      const formData = new FormData()
      formData.append('image', blob, `screenshot-${Date.now()}.png`)

      // Upload via our backend
      const response = await fetch(`${this.API_BASE}/api/upload/screenshot`, {
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
      console.log('✅ Image uploaded successfully:', result.url)
      
      return result.url

    } catch (error) {
      console.error('❌ Upload to Supabase failed:', error)
      return null
    }
  }

  /**
   * Generate a filename for the screenshot
   */
  private static generateFilename(element: Element): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const tagName = element.tagName.toLowerCase()
    const id = element.id ? `-${element.id}` : ''
    const className = element.className && typeof element.className === 'string' 
      ? `-${element.className.split(' ')[0]}` 
      : ''
    
    return `screenshot-${timestamp}-${tagName}${id}${className}.png`
  }
} 