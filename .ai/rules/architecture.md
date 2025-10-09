### Architecture — Clean Architecture
- Separate layers: entities, use cases, interfaces, frameworks.
- Dependencies point inward; inner layers have no knowledge of outer layers.
- Domain entities encapsulate business rules without framework dependencies.
- Use interfaces (ports) with adapter implementations for external deps.
- Use cases orchestrate entity interactions for specific operations.
- Use mappers to transform data between layers.