### Tooling — ESLint
- Configure project‑specific rules and shareable configs (Airbnb/Standard) as a base.
- Add custom rules for project‑specific patterns.
- Integrate with Prettier to avoid formatting conflicts.
- Use `--fix` in CI to auto‑correct fixable issues.
- Use staged linting (husky + lint‑staged) to block non‑compliant commits.