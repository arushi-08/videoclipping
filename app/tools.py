from .mcp_protocol import MCPTool


class RemoveDuplicatesTool(MCPTool):
    name = "remove_duplicates"
    description = "Adds captions to video based on transcript"
    
    def __init__(self, processor):
        self.processor = processor
        
    async def invoke(self, task_id: str, file_id: str, params: dict):
        return await self.processor.process_remove_duplicates(task_id, file_id, params)


class CaptionTool(MCPTool):
    name = "add_captions"
    description = "Adds captions to video based on transcript"
    
    def __init__(self, processor):
        self.processor = processor
        
    async def invoke(self, task_id: str, file_id: str, params: dict):
        return await self.processor.add_captions(task_id, file_id, params)


class MusicTool(MCPTool):
    name = "add_music"
    description = "Adds background music to video"
    
    def __init__(self, processor):
        self.processor = processor
        
    async def invoke(self, task_id: str, file_id: str, params: dict):
        return await self.processor.add_music(task_id, file_id, params)


class BrollTool(MCPTool):
    name = "add_broll"
    description = "Adds broll to video based on keywords"
    
    def __init__(self, processor):
        self.processor = processor
        
    async def invoke(self, task_id: str, file_id: str, params: dict):
        return await self.processor.add_broll(task_id, file_id, params)