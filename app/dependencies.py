from app.config import Settings
from app.graph import create_workflow
from app.services.video_processor import VideoProcessor


def get_settings() -> Settings:
    return Settings()

video_processor = None

def get_video_processor() -> VideoProcessor:
    global video_processor
    if not video_processor:
        video_processor = VideoProcessor(get_settings())
    return video_processor

graph = None

def init_graph():
    global graph
    if graph is None:
        processor = get_video_processor()
        graph = create_workflow(processor)
    return graph

def get_graph():
    return graph
