from fastapi import Depends, FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.cors import CORSMiddleware

from app.config import Settings
from app.dependencies import init_graph


def create_app(settings: Settings) -> FastAPI:
    app = FastAPI(
        title="Video Processing API",
        description="API for automated video editing workflows",
        version="1.0.0"
    )
    @app.on_event("startup")
    async def startup_event():
        init_graph()

    # Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    # Add templates configuration
    templates = Jinja2Templates(directory="templates")
    @app.get("/", include_in_schema=False)
    async def serve_frontend(request: Request):
        return templates.TemplateResponse("index.html", {"request": request})


    # Routes
    from app.routes import files, processing
    app.include_router(files.router, prefix="/api/files", tags=["files"])
    app.include_router(processing.router, prefix="/api/process", tags=["processing"])

    # Static files
    app.mount("/static", StaticFiles(directory="static"), name="static")
    app.mount("/processed", StaticFiles(directory="processed"), name="processed")


    @app.middleware("http")
    async def debug_routes(request: Request, call_next):
        print(f"\n→ Incoming request: {request.method} {request.url.path}")
        response = await call_next(request)
        return response
    
    @app.get("/routes", include_in_schema=False)
    def list_routes():
        return [
            {"path": route.path, "name": route.name, "methods": route.methods}
            for route in app.routes
        ]
    
    return app

settings = Settings()
app = create_app(settings)