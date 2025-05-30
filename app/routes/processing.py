import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from app.dependencies import get_graph, get_video_processor
from app.models.processing import AIEditRequest, ProcessRequest
from app.services.video_processor import VideoProcessor

router = APIRouter()

@router.post("/{file_id}/remove-duplicates")
async def process_remove_duplicates(
    file_id: str,
    request: ProcessRequest,
    background_tasks: BackgroundTasks,
    processor: VideoProcessor = Depends(get_video_processor),
):
    # try:
    print('request.params', request.params)
    if not file_id or not request.params['filename']:
        raise HTTPException(status_code=400, detail="Missing file information")

    task_id = str(uuid.uuid4())
    processor.active_tasks[task_id] = {"status": "processing"}
    background_tasks.add_task(
        processor.process_remove_duplicates,
        task_id,
        file_id,
        request.params
    )
    
    return {"task_id": task_id, "status": "processing_started"}
    # except Exception as e:
    #     raise HTTPException(
    #         status_code=500, 
    #         detail=f"Processing failed: {str(e)}"
    #     )

@router.post("/{file_id}/add-captions")
async def process_add_captions(
    file_id: str,
    request: ProcessRequest,
    background_tasks: BackgroundTasks,
    processor: VideoProcessor = Depends(get_video_processor),
):
    # try:
    task_id = str(uuid.uuid4())
    processor.active_tasks[task_id] = {"status": "processing"}

    background_tasks.add_task(
        processor.add_captions,
        task_id,
        file_id,
        request.params
    )
    return {"task_id": task_id, "status": "processing_started"}
    # except Exception as e:
    #     raise HTTPException(
    #         status_code=500, 
    #         detail=f"Captioning failed: {str(e)}"
    #     )
    
@router.post("/{file_id}/music")
async def add_music_endpoint(
    file_id: str,
    request: ProcessRequest,
    background_tasks: BackgroundTasks,
    processor: VideoProcessor = Depends(get_video_processor),
):
    # try:
    task_id = str(uuid.uuid4())
    processor.active_tasks[task_id] = {"status": "processing"}
    background_tasks.add_task(
        processor.add_music,
        task_id,
        file_id,
        request.params
    )
    return {"task_id": task_id, "status": "processing_started"}
    # except Exception as e:
    #     raise HTTPException(
    #         status_code=500, 
    #         detail=f"Adding music failed: {str(e)}"
    #     )

@router.post("/{file_id}/broll")
async def add_broll_endpoint(
    file_id: str,
    request: ProcessRequest,
    background_tasks: BackgroundTasks,
    processor: VideoProcessor = Depends(get_video_processor)
):
    try:
        task_id = str(uuid.uuid4())
        processor.active_tasks[task_id] = {"status": "processing"}
        background_tasks.add_task(
            processor.add_broll,
            task_id,
            file_id,
            request.params
        )
        return {"task_id": task_id, "status": "processing_started"}
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Captioning failed: {str(e)}"
        )


@router.get("/{task_id}/status")
async def get_status(
    task_id: str,
    processor: VideoProcessor = Depends(get_video_processor)
):
    task = processor.active_tasks.get(task_id)
    print('here task', task)
    if not task:
        raise HTTPException(404, detail="Unknown task ID")
    print('get_status task', task)
    return {"task_id": task_id, **task}


@router.post('/ai-edit')
async def ai_edit(
    request: AIEditRequest,
    background_tasks: BackgroundTasks,
    processor: VideoProcessor = Depends(get_video_processor)
):
    task_id = str(uuid.uuid4())
    processor.active_tasks[task_id] = {"status": "processing"}
    graph = get_graph()
    initial_state = {
        "task_id": task_id,
        "user_input": request.user_input,
        "file_id": request.file_id,
        "filename": request.filename,
        "music_file_id": request.music_file_id,
        "music_filename": request.music_filename,
        "current_step": 0,
        "plan": [],
        "results": []
    }
    print('CHECK request.filename', request.filename)
    
    background_tasks.add_task(
        execute_workflow,
        graph,
        initial_state,
        processor
    )
    
    return {"task_id": task_id, "status": "processing_started"}


async def execute_workflow(graph, state, processor):
    # try:
    async for step in graph.astream(state):
        processor.active_tasks[state["task_id"]] = {
            "status": f"step_{state['current_step']}",
            "current_step": state["current_step"],
            "total_steps": len(state["plan"])
        }

    processor.active_tasks[state["task_id"]] = {
        "status": "completed",
        "status" : "processing complete"
    }

    # except Exception as e:
    #     processor.active_tasks[state["task_id"]] = {
    #         "status": "failed",
    #         "error": str(e)
    #     }