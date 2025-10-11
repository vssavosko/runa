# 🔮 Runa

Multi-agent end-to-end testing workflow powered by Mastra. It plans scenarios with an LLM, executes them via Playwright MCP, and posts a rich report back to the pull request.

Scenario types include: happy‑path, edge‑case, negative, smoke, and more. Supported LLM providers: OpenAI, Anthropic, Google, OpenRouter, and Hugging Face.

## ✨ What It Does

- Generates E2E scenarios from the pull request description and list of changed files.
- Executes scenarios in a real browser via Playwright MCP (no handwritten test code).
- Collects artifacts (screenshots/videos when available) and aggregates metrics.
- Posts a friendly Markdown report as a pull request comment.
- Ships as a reusable GitHub Actions workflow — easy to plug into any repo.

## 🧠 How It Works

Four-step pipeline (workflow `automation-test-workflow`):

1. Fetch: reads pull request metadata, changed files, and extracts a Test URL from the description.
2. Plan: the planner-agent generates structured E2E scenarios.
3. Test: the playwright-agent executes scenarios using MCP tools.
4. Report: publishes a summary (passed/failed/flaky, reasons, artifacts) back to the pull request.

## 🚀 Quick Start

Create `.github/workflows/runa.yml` in your repository and call this reusable workflow:

```yaml
name: Runa

on:
  workflow_dispatch:

permissions:
  contents: read
  pull-requests: write
  issues: write

jobs:
  run:
    uses: vssavosko/runa/.github/workflows/runa.yml@main
    secrets:
      # Required
      GITHUB_ACCESS_TOKEN: ${{ secrets.GITHUB_TOKEN }} # or a GitHub App token / PAT
      MODEL_NAME: gpt-4o-mini # depends on the chosen provider

      # Provide at least one provider API key
      OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      # ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      # GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}
      # OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
      # HUGGINGFACE_API_KEY: ${{ secrets.HUGGINGFACE_API_KEY }}

      # Optional
      MODEL_NAME_FOR_STRUCTURED_OUTPUT: gpt-4o-mini # model used for strict structured output
      MAX_NUMBER_OF_SCENARIOS: '3' # number of test scenarios. Default is 3
      DELAY_BETWEEN_SCENARIOS: '45000' # delay between scenarios (ms). Default is 45000

      # If using a GitHub App
      # APP_ID: ${{ secrets.APP_ID }}
      # APP_PRIVATE_KEY: ${{ secrets.APP_PRIVATE_KEY }}
```

Token/App permissions recommendations:

- GitHub App repository permissions: `contents: read`, `issues: read & write`, `pull requests: read & write`, `metadata: read`.
- If using a PAT, you need the `repo` scope (at minimum: write access to issues and pull requests). Store it as a secret.

## 📝 Pull Request Description Requirement

In the pull request body, specify the environment URL to test, in the following format:

```txt
Test URL: https://your-preview-or-env.example.com
```

The URL may also appear on the line below after the colon. This link is used as the base address to start E2E testing.

**Tip:** For better test scenario generation, you can also add additional context in the pull request description, such as:

- Custom test cases or specific user flows to test
- Important functionality that should be covered
- Any specific requirements or edge cases
- Additional context about the codebase or application behavior

The planner-agent will use this information to generate more relevant and comprehensive test scenarios for your pull request.

## 💻 Local Run

Requirements:

- Node.js ≥ 20.9.0
- pnpm ≥ 9

## Steps

1. Environment setup:

   ```bash
   cp .env.example .env

   # Do not forget to edit your .env file.
   ```

2. Install, build, and start dev mode:

   ```bash
   pnpm install
   pnpm build:ci
   pnpm dev
   ```

## 🏗️ Tech Stack

- Node.js
- TypeScript
- Mastra
- Playwright MCP
- Vercel AI SDK
- Octokit
- Zod
- Biome

## ✅ Linting & Formatting

Biome is used for linting and formatting.

- Configuration: `biome.json`
- VS Code recommendations: `.vscode/recommendations.json:1`, `.vscode/settings.json:1`

```bash
pnpm lint
pnpm lint:fix
pnpm format
pnpm format:check
```

## 🧭 Roadmap

- [ ] Database Connection Support

  Goal: Implement URI transmission for database connection to support short-term and long-term memory across test runs.

- [ ] On-Demand Memory Integration

  Goal: Implement on-demand memory connection (short-term and long-term) to provide agents with context from previous test runs.

- [ ] Working Memory Architecture

  Goal: Research the necessity and design architecture for working memory to maintain coherence within a single workflow run.

## 🤝 Contributing

Pull requests are welcome. Please follow Biome rules (lint + format), Node.js 20, and pnpm 9. Before opening a pull request, ensure `pnpm build:ci && pnpm lint && pnpm format:check` pass successfully.

## 📄 License

Apache-2.0 — see `LICENSE`.
