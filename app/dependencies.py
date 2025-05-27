from app.config import Settings
from app.graph import create_workflow
from app.services.video_processor import VideoProcessor


def get_settings() -> Settings:
    return Settings()

def get_video_processor() -> VideoProcessor:
    return VideoProcessor(get_settings())

graph = None

def init_graph():
    global graph
    if graph is None:
        processor = get_video_processor()
        graph = create_workflow(processor)
    return graph

def get_graph():
    return graph
