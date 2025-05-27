import uuid
from pathlib import Path

import aiofiles
from fastapi import UploadFile


async def save_upload_file(upload_file: UploadFile, upload_dir: str) -> str:
    """Save uploaded file to designated directory with UUID-based organization"""
    file_id = str(uuid.uuid4())
    file_path = Path(upload_dir) / file_id
    file_path.mkdir(parents=True, exist_ok=True)

    dest_path = file_path / upload_file.filename
    
    async with aiofiles.open(dest_path, 'wb') as buffer:
        while content := await upload_file.read(1024 * 1024):  # 1MB chunks
            await buffer.write(content)
    
    return file_id