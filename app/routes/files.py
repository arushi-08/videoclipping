from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.config import Settings
from app.dependencies import get_settings
from app.services.file_manager import save_upload_file

router = APIRouter()

@router.post("/upload")
async def upload_video_file(
    file: UploadFile = File(...),
    file_type: str = Form("video"),
    settings: Settings = Depends(get_settings)
):
    try:
        if file_type not in ["video", "music"]:
            raise HTTPException(status_code=400, detail="Invalid file type")
        
        upload_dir = settings.UPLOAD_DIR
        if file_type == "music":
            upload_dir = settings.MUSIC_UPLOAD_DIR

        file_id = await save_upload_file(file, upload_dir)
        return {
            "file_id": file_id,
            "filename": file.filename,
            "download_url" : f"/api/files/download/{file_id}/{file.filename}",
            "file_type": file_type,
            "status": "uploaded"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"File upload failed: {str(e)}"
        )
    

@router.get("/download/{file_id}/{filename}")
async def download_processed_file(
    file_id: str,
    filename: str,
    settings: Settings = Depends(get_settings)
):
    file_path = Path(settings.PROCESSED_DIR) / file_id / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        file_path,
        media_type="application/octet-stream",
        filename=filename
    )
