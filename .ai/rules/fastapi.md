### Backend — FastAPI
- Use Pydantic models for request/response validation with strict typing and custom validators.
- Inject dependencies for services and DB sessions for testability and resource management.
- Prefer async endpoints for I/O‑bound operations and higher throughput.
- Use background tasks for non‑critical work that shouldn’t block responses.
- Handle errors via `HTTPException` and custom exception handlers.
- Use path operation decorators with correct HTTP methods.
