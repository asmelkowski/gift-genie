## Github Action Rule

### General Guidelines
- Check if `package.json` exists in project root and summarize key scripts
- Check if `.nvmrc` exists in project root
- Check if `.env.example` exists in project root to identify key `env:` variables
- Always use `git branch -a | cat` to verify whether we use `main` or `master` branch
- Always use `env:` variables and secrets attached to jobs instead of global workflows
- Always use `npm ci` for Node-based dependency setup
- Extract common steps into composite actions in separate files

### Docker-First CI/CD (When Dockerfiles Present)
When the project uses Docker:
- **Build images once** in a dedicated job using Docker Buildx
- **Use GitHub Actions cache** (`type=gha`) for Docker layer caching
- **Build all targets** needed (development, production) and upload as artifacts
- **Run all tests inside containers** to match production environment exactly
- **Prefer container-based testing** over installing dependencies directly on runners
- Use `docker/build-push-action@v6` with `cache-from` and `cache-to` for optimal caching
- Store images as tar files in artifacts for job reuse (retention-days: 1 for temp images)
- Run linting, type checking, and unit tests inside development containers
- Run E2E tests using production backend + development frontend (for Playwright)

**Benefits:**
- Validates Docker setup in CI
- Ensures consistency between CI and production
- Reduces CI runner setup time
- Tests actual deployment artifacts
- Better layer caching across builds

### Final Verification Steps
Once you're done, as a final step conduct the following: 

1) For each public action always use <tool>"Run Terminal"</tool> to see what is the most up-to-date version (use only major version):

```bash
curl -s https://api.github.com/repos/{owner}/{repo}/releases/latest | grep '"tag_name":' | sed -E 's/.*"v([0-9]+).*/\1/'
```

2) (Ask if needed) Use <tool>"Run Terminal"</tool> to fetch README.md and see if we're not using any deprecated actions by mistake:

```bash
curl -s https://raw.githubusercontent.com/{owner}/{repo}/refs/tags/v{TAG_VERSION}/README.md
```

3) (Ask if needed) Use <tool>"Run Terminal"</tool> to fetch repo metadata and see if we're not using any deprecated actions by mistake:

```bash
curl -s https://api.github.com/repos/{owner}/{repo} | grep '"archived":'
```

4) (Ask if needed) In case of linter issues related to action parameters, try to fetch action description directly from GitHub and use the following command:

```bash
curl -s https://raw.githubusercontent.com/{owner}/{repo}/refs/heads/{main/master}/action.yml
```
