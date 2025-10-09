from dataclasses import dataclass


@dataclass(slots=True)
class RegisterUserCommand:
    email: str
    password: str
    name: str
