import os
import uuid
from datetime import datetime
from typing import Optional
from fastapi import HTTPException, File, UploadFile, Depends
from supabase import create_client, Client
from config import settings
from auth_service import get_current_user
import logging

logger = logging.getLogger(__name__)

# Initialize Supabase client with service role for admin operations
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

class ScreenshotService:
    BUCKET_NAME = "screenshots"
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"]

    @staticmethod
    def validate_image(file: UploadFile) -> bool:
        """Validate uploaded image file"""
        # Check file type
        if file.content_type not in ScreenshotService.ALLOWED_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed types: {', '.join(ScreenshotService.ALLOWED_TYPES)}"
            )
        
        # Check file size
        if file.size and file.size > ScreenshotService.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size: {ScreenshotService.MAX_FILE_SIZE / (1024*1024)}MB"
            )
        
        return True

    @staticmethod
    def generate_filename(original_filename: str, user_id: str) -> str:
        """Generate a unique filename for the screenshot"""
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        file_extension = os.path.splitext(original_filename)[1] or ".png"
        
        return f"user_{user_id}/{timestamp}_{unique_id}{file_extension}"

    @staticmethod
    async def upload_screenshot(file: UploadFile, current_user: dict) -> dict:
        """Upload screenshot to Supabase Storage"""
        try:
            logger.info(f"📸 Starting screenshot upload for user: {current_user.get('email')}")
            
            # Validate file
            ScreenshotService.validate_image(file)
            
            # Generate unique filename
            filename = ScreenshotService.generate_filename(file.filename or "screenshot.png", current_user["id"])
            logger.info(f"📁 Generated filename: {filename}")
            
            # Read file content
            file_content = await file.read()
            logger.info(f"📦 File size: {len(file_content)} bytes")
            
            # Upload to Supabase Storage
            try:
                result = supabase.storage.from_(ScreenshotService.BUCKET_NAME).upload(
                    filename,
                    file_content,
                    file_options={
                        "content-type": file.content_type,
                        "cache-control": "3600"  # Cache for 1 hour
                    }
                )
                
                if hasattr(result, 'error') and result.error:
                    logger.error(f"❌ Supabase storage error: {result.error}")
                    raise HTTPException(
                        status_code=500,
                        detail=f"Storage upload failed: {result.error}"
                    )
                
                logger.info(f"✅ File uploaded successfully to: {filename}")
                
            except Exception as upload_error:
                logger.error(f"❌ Upload error: {str(upload_error)}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to upload file: {str(upload_error)}"
                )
            
            # Generate public URL
            try:
                url_result = supabase.storage.from_(ScreenshotService.BUCKET_NAME).get_public_url(filename)
                public_url = url_result
                
                if not public_url:
                    logger.error("❌ Failed to generate public URL")
                    raise HTTPException(
                        status_code=500,
                        detail="Failed to generate public URL"
                    )
                
                logger.info(f"🔗 Public URL generated: {public_url}")
                
            except Exception as url_error:
                logger.error(f"❌ URL generation error: {str(url_error)}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to generate public URL: {str(url_error)}"
                )
            
            # Log upload to database for tracking (optional)
            try:
                upload_record = supabase.table("screenshot_uploads").insert({
                    "user_id": current_user["id"],
                    "filename": filename,
                    "original_filename": file.filename,
                    "file_size": len(file_content),
                    "content_type": file.content_type,
                    "public_url": public_url
                }).execute()
                
                logger.info(f"📊 Upload logged to database: {upload_record.data[0]['id'] if upload_record.data else 'unknown'}")
                
            except Exception as db_error:
                # Don't fail the upload if database logging fails
                logger.warning(f"⚠️ Failed to log upload to database: {str(db_error)}")
            
            return {
                "success": True,
                "url": public_url,
                "filename": filename,
                "size": len(file_content),
                "message": "Screenshot uploaded successfully"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Unexpected error in screenshot upload: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Internal server error: {str(e)}"
            )

    @staticmethod
    async def delete_screenshot(filename: str, current_user: dict) -> dict:
        """Delete a screenshot from Supabase Storage"""
        try:
            logger.info(f"🗑️ Deleting screenshot: {filename} for user: {current_user.get('email')}")
            
            # Verify the file belongs to the user (security check)
            if not filename.startswith(f"user_{current_user['id']}/"):
                logger.warning(f"⚠️ User {current_user['id']} attempted to delete file not owned by them: {filename}")
                raise HTTPException(
                    status_code=403,
                    detail="You can only delete your own screenshots"
                )
            
            # Delete from storage
            result = supabase.storage.from_(ScreenshotService.BUCKET_NAME).remove([filename])
            
            if hasattr(result, 'error') and result.error:
                logger.error(f"❌ Failed to delete file: {result.error}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to delete file: {result.error}"
                )
            
            logger.info(f"✅ Screenshot deleted successfully: {filename}")
            
            return {
                "success": True,
                "message": "Screenshot deleted successfully"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Unexpected error in screenshot deletion: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Internal server error: {str(e)}"
            )

# FastAPI endpoint handlers
async def upload_screenshot_endpoint(
    image: UploadFile = File(..., description="Screenshot image file"),
    current_user: dict = Depends(get_current_user)
):
    """Upload a screenshot image"""
    return await ScreenshotService.upload_screenshot(image, current_user)

async def delete_screenshot_endpoint(
    filename: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a screenshot image"""
    return await ScreenshotService.delete_screenshot(filename, current_user) 