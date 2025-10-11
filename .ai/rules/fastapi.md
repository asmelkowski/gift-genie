### Backend — FastAPI
- Use Pydantic models for request/response validation with strict typing and custom validators.
- Inject dependencies for services and DB sessions for testability and resource management.
- Prefer async endpoints for I/O‑bound operations and higher throughput.
- Use background tasks for non‑critical work that shouldn't block responses.
- Handle errors via `HTTPException` and custom exception handlers.
- Use path operation decorators with correct HTTP methods.
- **Input validation**: All input validation (format, type, constraints) must happen at the presentation layer using FastAPI/Pydantic validators. Use appropriate types (UUID, EmailStr, datetime, etc.) for path/query parameters and request body fields. Application layer (use cases) and infrastructure layer (repositories) should trust their inputs and never perform format validation or type conversion. Invalid inputs automatically return 422 Unprocessable Entity with descriptive error messages.
