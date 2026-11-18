from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.config import settings
from app.api.v1.api import api_router
from app.database import engine, Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables are created (useful for local development & SQLite fallback)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API для платформи UCU SideQuest — активності та події Українського Католицького Університету.",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        field = " -> ".join([str(loc) for loc in err["loc"] if loc != "body"])
        errors.append(f"{field}: {err['msg']}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Помилка валідації вхідних даних", "errors": errors}
    )


# Include v1 Router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/health", tags=["Системні"])
async def health_check():
    return {
        "status": "healthy",
        "service": "UCU SideQuest Backend",
        "version": settings.VERSION,
        "timezone": settings.APP_TIMEZONE
    }


@app.get("/", tags=["Системні"])
async def root():
    return {
        "message": "Ласкаво просимо до API UCU SideQuest!",
        "docs": f"{settings.API_V1_STR}/docs"
    }
