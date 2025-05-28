
from typing import Any, Dict, List, Optional, TypedDict

from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langgraph.graph import END, StateGraph

from app.config import Settings
from app.models.processing import AIEditRequest


class GraphState(TypedDict):
    task_id: str
    user_input: str
    file_id: str
    filename: Optional[str]
    music_file_id: Optional[str]
    music_filename: Optional[str]
    current_step: int
    plan: List[Dict]
    results: List[Any]
    error: str = None

def create_llm(settings: Settings):
    return ChatOpenAI(model_name=settings.MODEL_NAME,
    openai_api_key=settings.API_KEY,
    openai_api_base=settings.BASE_URL)

# Planner prompt template
PLANNER_PROMPT = ChatPromptTemplate.from_template("""
You are a professional video editing AI. Create a processing plan based on:

User Input: {user_input}
Available Tools: {tools}
Style Preference: {style_preference}
Output Format: {output_format}

Generate a JSON array of processing steps with 'name' and 'args'. 
Use only these tools: remove_duplicates, add_captions, add_music, add_broll, and style preferences if the user input specifically requests it.
Only include steps that are directly requested in the user input.
Order steps logically for video processing workflow.

Example Response:
User Input: Remove duplicates from the video and add captions of size 32 and background music at normal volume.
Plan:
[
    {{"name": "remove_duplicates", "args": {{}}}},
    {{"name": "add_captions", "args": {{"font_size": 32}}}},
    {{"name": "add_music", "args": {{"music_volume": 0.4}}}}
]
""")

def create_workflow(processor):
    llm = create_llm(processor.settings)
    parser = JsonOutputParser()
    
    async def planner_node(state: GraphState):
        print(f"[planner_node] Entered with state: {state}")
        if state.get('plan'):
            print("[planner_node] Plan already exists, returning state.")
            return state
            
        # Get available tools from MCP registry
        available_tools = list(processor.mcp_registry.tools.keys())
        print(f"[planner_node] Available tools: {available_tools}")
        
        # Construct the planning chain
        chain = PLANNER_PROMPT | llm | parser
        
        # Generate plan
        plan = await chain.ainvoke({
            "user_input": state["user_input"],
            "tools": available_tools,
            "style_preference": state.get("style_preference", "cinematic"),
            "output_format": state.get("output_format", "mp4")
        })
        for step in plan:
            print('CHECK state.get("filename", "")', state.get("filename", ""))
            step["args"]["filename"] = state.get("filename", "")
            step["args"]["music_file_id"] = state.get("music_file_id", "")
            step["args"]["music_filename"] = state.get("music_filename", "")

        print(f"[planner_node] Plan generated: {plan}")
        
        return {
            **state,
            "plan": plan,
            "current_step": 0
        }
    
    async def error_handler_node(state: GraphState):
        print(f"[error_handler_node] Handling error: {state.get('error')}")
        processor.active_tasks[state["task_id"]] = {
            "status": "failed",
            "error": state["error"]
        }
        return state
    
    workflow = StateGraph(GraphState)
    
    # Define Nodes
    workflow.add_node("planner", planner_node)
    workflow.add_node("execute_step", create_execute_node(processor))
    workflow.add_node("error_handler", error_handler_node)

    workflow.set_entry_point("planner")
    # Define Edges
    workflow.add_edge("planner", "execute_step")
    workflow.add_conditional_edges(
        "execute_step",
        decide_next_step,
        {
            "continue": "execute_step",
            "error": "error_handler",
            "complete": END
        }
    )
    workflow.add_edge("error_handler", END)
    
    return workflow.compile()

# Execution Node Factory
def create_execute_node(processor):
    async def execute_node(state: GraphState):
        print(f"[execute_node] Entered with state: {state}")
        if state.get("error"):
            print(f"[execute_node] Error detected in state: {state['error']}")
            return {
                **state,
                "error": str(e)
            }
            
        current_step = state["current_step"]
        step = state["plan"][current_step]
        print(f"[execute_node] Executing step {current_step}: {step}")

        tool_cls = processor.mcp_registry.tools.get(step["name"])
        if not tool_cls:
            raise AttributeError(f"No tool registered for '{step['name']}'")
        
        tool = tool_cls(processor)

        try:
            result = await tool.invoke(
                state["task_id"],
                state["file_id"],
                step.get("args", {})
            )
            return {
                **state,
                "current_step": current_step + 1,
                "results": [*state["results"], result]
            }
        except Exception as e:
            print(f"[execute_node] Failed to fetch step: {e}")
            print('state["results"]', state["results"])
            return {
                **state,
                "error": str(e)
            }
            
    return execute_node

# Conditional Edge Logic
def decide_next_step(state: GraphState):
    if state.get("error"):
        return "error"
    if state["current_step"] >= len(state["plan"]):
        return "complete"
    return "continue"
