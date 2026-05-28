# Technical Architecture

## Architectural Philosophy
PRISM uses a hybrid architecture:
- Modern frontend/application tooling
- Explicit backend processing
- AWS-native services
- Low operational overhead, strong observability, low ongoing cost
- Understandable and maintainable by a solo/founder-led team.

## High-Level Architecture
1. **Frontend / Core Backend**: AWS Amplify Gen 2 (React + Material UI) for hosting, Cognito authentication, and lightweight CRUD interactions. Prioritizes mobile-friendly and fast operational review workflows.
2. **Explicit Backend Services (AWS SAM)**: Dedicated AWS SAM (Serverless Application Model) applications for heavy, explicit asynchronous workflows:
   - Source scanning & ingestion
   - AI assessment (Bedrock integration)
   - Export generation & scheduled jobs
   These SAM apps run via EventBridge, Lambda, and Step Functions, keeping heavy business logic cleanly separated from the frontend.

## Data Storage Strategy
- **DynamoDB (Structured metadata)**: Stores Knowledge Items, Entities, Relationships, Source Definitions, Export Profiles, and audit data.
- **S3 (Large objects)**: Stores markdown exports, generated ZIP bundles, large source bodies, and temporary export files.

## Environment, Deployment & Structure
- **Naming Convention**: `prism-{environment}-{resource}` (e.g., `prism-dev-knowledge-items`).
- **Environments**: Strict separation between `prism-dev` and `prism-prod`.
- **Repository Strategy**: All code lives in the `prism-app` repository (monorepo structure):
  - `prism-app/src/` -> React frontend
  - `prism-app/amplify/` -> Amplify Gen 2 configs (Auth, simple data)
  - `prism-app/services/` -> AWS SAM applications (ingestion, assessment, exports)

## AI Integration
- **Amazon Bedrock**: Used for article summarisation, metadata extraction, entity suggestion, relationship suggestion, and markdown drafting.
- **Async Processing**: Background workflows use asynchronous/event-driven processing (Lambda, EventBridge).

## Future Extensibility
The architecture supports future additions like semantic search, embeddings, graph analysis, and customer-facing AI assistants.
