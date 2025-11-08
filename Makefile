# Gift Genie Project Makefile
# This Makefile provides convenient commands for managing the project,
# including pre-commit hook management and other common development tasks.

.PHONY: help install-pre-commit run-pre-commit update-pre-commit clean-pre-commit

# Default target
help: ## Display this help message
	@echo "Gift Genie Project - Available Commands:"
	@echo ""
	@echo "Pre-commit Management:"
	@echo "  install-pre-commit  Install pre-commit hooks"
	@echo "  run-pre-commit      Run pre-commit on all files"
	@echo "  update-pre-commit   Update pre-commit hooks to latest versions"
	@echo "  clean-pre-commit    Uninstall pre-commit hooks"
	@echo ""
	@echo "Use 'make help' to show this message."

# Pre-commit Management Commands

install-pre-commit: ## Install pre-commit hooks for the project
	@echo "Installing pre-commit hooks..."
	@if command -v pre-commit >/dev/null 2>&1; then \
		pre-commit install; \
		echo "✅ Pre-commit hooks installed successfully"; \
	else \
		echo "❌ Error: pre-commit is not installed. Please install it first:"; \
		echo "   pip install pre-commit"; \
		exit 1; \
	fi

run-pre-commit: ## Run pre-commit on all files (useful for manual checks)
	@echo "Running pre-commit on all files..."
	@if command -v pre-commit >/dev/null 2>&1; then \
		pre-commit run --all-files; \
		echo "✅ Pre-commit check completed"; \
	else \
		echo "❌ Error: pre-commit is not installed. Please install it first:"; \
		echo "   pip install pre-commit"; \
		exit 1; \
	fi

update-pre-commit: ## Update pre-commit hooks to their latest versions
	@echo "Updating pre-commit hooks..."
	@if command -v pre-commit >/dev/null 2>&1; then \
		pre-commit autoupdate; \
		echo "✅ Pre-commit hooks updated successfully"; \
		echo "💡 Consider running 'make run-pre-commit' after updating"; \
	else \
		echo "❌ Error: pre-commit is not installed. Please install it first:"; \
		echo "   pip install pre-commit"; \
		exit 1; \
	fi

clean-pre-commit: ## Uninstall pre-commit hooks from the repository
	@echo "Removing pre-commit hooks..."
	@if command -v pre-commit >/dev/null 2>&1; then \
		pre-commit uninstall; \
		echo "✅ Pre-commit hooks uninstalled successfully"; \
	else \
		echo "❌ Error: pre-commit is not installed. Please install it first:"; \
		echo "   pip install pre-commit"; \
		exit 1; \
	fi
