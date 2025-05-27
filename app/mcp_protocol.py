from abc import abstractmethod
from typing import Dict, Protocol, Type


class MCPTool(Protocol):
    @abstractmethod
    async def invoke(self, task_id: str, file_id: str, params: dict) -> dict:
        pass

class MCPRegistry:
    def __init__(self):
        self.tools: Dict[str, Type[MCPTool]] = {}
        
    def register(self, name: str, tool_class: Type[MCPTool]):
        self.tools[name] = tool_class
        
    def create_tool(self, name: str, *args, **kwargs) -> MCPTool:
        return self.tools[name](*args, **kwargs)

# Create registry without tool implementations
mcp_registry = MCPRegistry()


class MCPTool(Protocol):
    name: str
    description: str
    
    async def invoke(self, task_id: str, file_id: str, params: dict) -> dict:
        ...

class MCPRegistry:
    def __init__(self):
        self.tools: Dict[str, MCPTool] = {}
        
    def register(self, tool: MCPTool):
        self.tools[tool.name] = tool
        
    def get_tool(self, name: str) -> MCPTool:
        return self.tools.get(name)

# Register other tools...