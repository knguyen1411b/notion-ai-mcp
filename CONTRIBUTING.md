# Contributing to Notion AI MCP Server 🤝

Thank you for your interest in contributing to the **Notion AI MCP Server**! Contributions make the open-source community an amazing place to learn, inspire, and create.

This document outlines the guidelines and steps to help you get started with contributing.

---

## Codebase Architecture

Before writing code, it is helpful to understand the structure of the repository:

*   **`src/index.ts`**: The main entrypoint of the Model Context Protocol (MCP) server. It initializes the Stdio server transport, registers tools (`notion_test_connection`, `notion_get_page_content`, `notion_update_section`, `notion_append_content`), and handles RPC execution.
*   **`src/utils/`**:
    *   `notion.ts`: Notion Client wrappers, page ID sanitizers, heading finders, block parsers, and Markdown converters.
    *   `markdown.ts`: Custom inline and block-level Markdown compiler converting raw MD tokens into Notion block structures.
*   **`src/scripts/`**: Independent CLI scripts used for manual testing and local execution without launching an MCP client:
    *   `test-connection.ts`: Simple verification of API credentials and page access.
    *   `read-page.ts`: Reads the target page and renders the page hierarchy inside the console.
    *   `write-section.ts`: Simulates heading section overwrite.

---

## Local Development Setup

To set up a local development environment:

1.  **Fork and Clone** the repository.
2.  Install dependencies using **pnpm**:
    ```bash
    pnpm install
    ```
3.  Set up local environment variables:
    ```bash
    cp .env.example .env
    ```
    Open `.env` and fill in your `NOTION_API_KEY` and a test `NOTION_PAGE_ID`. Make sure your Notion Page has the Integration shared with it.

---

## Development & Code Quality Scripts

To maintain high code quality, we employ formatting and compilation checks. You should run these scripts before creating a Pull Request:

*   **Format Code:**
    ```bash
    pnpm format
    ```
    Uses Prettier to clean and standardise the code layout.
*   **Lint Code:**
    ```bash
    pnpm lint
    ```
    Runs ESLint to find unused variables, syntax problems, or scoping bugs.
*   **Type-check:**
    ```bash
    pnpm typecheck
    ```
    Validates the codebase with TypeScript compiler (`tsc --noEmit`) to ensure everything is strictly typed.
*   **Build Project:**
    ```bash
    pnpm build
    ```
    Compiles TypeScript files into the target executable inside `/dist`.

---

## Git Workflow & Husky Hooks

We use **Husky** to automate code quality checks before commits are finalized.

*   When you run `git commit`, Husky triggers a `pre-commit` hook that automatically runs:
    ```bash
    pnpm typecheck && pnpm lint
    ```
*   If either checks fail, the commit is aborted. Please fix the warnings/errors before trying to commit again.

### Commit Message Conventions
To keep history clean, we recommend using semantic commit messages:
*   `feat: ...` for a new feature.
*   `fix: ...` for a bug fix.
*   `docs: ...` for documentation changes.
*   `refactor: ...` for codebase reorganization without adding features.
*   `chore: ...` for dependencies or config updates.

---

## Submitting Pull Requests

1.  Create a branch from `main`: `git checkout -b feature/my-new-feature`.
2.  Make changes and write descriptive comments.
3.  Ensure formatting, linting, and building passes.
4.  Commit your work: `git commit -m "feat: add support for XYZ block"` (letting Husky verify it).
5.  Push to your fork and submit a **Pull Request** to the `main` branch.

We look forward to your contributions! 🎉
