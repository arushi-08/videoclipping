from typing import List, Optional

from pydantic import BaseModel, Field


class ProcessRequest(BaseModel):
    file_id: str
    params: dict = {}

class CaptionRequest(BaseModel):
    file_id: str
    # font_size: int = 28
    params : dict = {}

class MusicRequest(BaseModel):
    file_id: str
    params: dict = {}

class BrollRequest(BaseModel):
    file_id: str
    params: dict = {}


class AIEditRequest(BaseModel):
    """Request model for AI-powered editing endpoint"""
    user_input: str = Field(
        ...,
        description="Natural language editing instructions (e.g., 'Make a dramatic trailer with captions and epic music')",
        min_length=5,
        max_length=500
    )
    file_id: str = Field(
        ...,
        description="Target video file ID to process",
        min_length=1,
        max_length=64
    )
    filename: Optional[str] = Field(
        ...,
        description="Target video filename to process",
        min_length=1,
        max_length=100
    )
    music_file_id: Optional[str] = Field(
        ...,
        description="Target background music file ID to add to main file Id",
        min_length=1,
        max_length=64
    )
    music_filename: Optional[str] = Field(
        ...,
        description="Target background music filename to add to main file Id",
        min_length=1,
        max_length=100
    )
    style_preference: Optional[str] = Field(
        None,
        description="Preferred visual style for the edit",
        enum=["cinematic", "social-media", "documentary", "vlog"]
    )
    output_format: Optional[str] = Field(
        "mp4",
        description="Desired output format",
        enum=["mp4", "mov", "webm"]
    )
    additional_context: Optional[dict] = Field(
        {},
        description="Additional parameters for the AI edit (e.g., {'target_length': 60, 'brand_colors': ['#FF0000']})"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "user_input": "Create a 30-second Instagram reel with dynamic captions and upbeat background music",
                "file_id": "12345",
                "filename": "vid_12345",
                "style_preference": "social-media",
                "output_format": "mp4",
                "additional_context": {
                    "target_length": 30,
                    "platform": "instagram",
                    "brand_colors": ["#FFFFFF", "#000000"]
                }
            }
        }