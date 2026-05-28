# AI & Prompt Management Philosophy

## Core Prompt Philosophy (Operations as Code)
Prompt management is a software engineering concern, not an end-user workflow.
- Prompts are managed in code.
- Version-controlled in GitHub.
- Deployment-controlled, observable, and testable.
- The platform does not expose prompt editing to end-users to prevent drift and operational breakage.

## AI Execution Philosophy
- **Human-in-the-loop**: AI assists but does not autonomously publish.
- **Deterministic & Structured**: Prompts must target stable, machine-readable schemas (e.g., JSON). Freeform outputs are avoided.
- **Cost-conscious**: V1 uses a small number of well-understood, cost-effective models. No dynamic routing or complex multi-agent orchestration.
- **Observable**: Every assessment records prompt version, model ID, timestamp, and raw model response for debugging and regression testing.

## Regeneration Rules
AI regeneration actions (e.g., regenerate summary, regenerate entities) must always be explicit reviewer actions. Silent automatic reprocessing is forbidden.
