# PRISM (Product Radars Intelligence & Signal Management)

PRISM is a generic, AI-assisted knowledge ingestion and curation platform. It gathers candidate information from monitored sources, uses an LLM to assess and structure it, routes it through a fast human review workflow (using a swipe left/right interface), and stores approved knowledge in a structured, machine-readable knowledge base. 

The core idea is to move from manually collecting useful articles to building a structured, curated, reusable knowledge corpus that can improve chatbot outputs, analyst workflows, and create a proprietary intelligence asset.

This platform is about building out the knowledge base, not analysing or doing complex reasoning on it.  Outputs are intended to be consumed by other systems such as LLMs and LLM platforms like NotebookLM - the output can be tailored or transformed to meet the specific needs and best practices of the consuming system.  

## Core Workflow

**Discover source material → AI assess and summarise → human review and score → publish into structured knowledge base → export to LLM-ready formats.**

## High-Level Overview

The PRISM architecture is split into two primary components to maintain low operational overhead and keep heavy business logic separated from the frontend:

1. **Frontend & Core Backend (`prism-app/`)**: 
   Built with **React** (Vite) and **AWS Amplify Gen 2**. This layer handles hosting, user authentication (Amazon Cognito), and lightweight CRUD interactions for the operational review workflows. It uses Material UI for a clean, responsive, mobile-first interface.
2. **Explicit Backend Services (`services/`)**: 
   An **AWS SAM** (Serverless Application Model) application responsible for heavy, asynchronous background jobs. It uses explicit AWS-native services like Lambda, EventBridge, and Bedrock:
   - **Ingestion**: Periodically scans source definitions and extracts raw material.
   - **AI Assessment**: Uses Amazon Bedrock (Claude) to draft curated "Knowledge Items" from the ingested sources, extracting entities, relationships, and metadata.
   - **Exports**: Generates markdown bundles and executes scheduled jobs.

### Data Storage Strategy
- **DynamoDB**: Stores structured metadata, including Knowledge Items, Entities, Relationships, and Source Definitions.
- **S3**: Stores large objects such as markdown exports, raw source bodies, and generated ZIP bundles.

## Repository Structure

This repository uses a monorepo-style structure (`prism-app` primary repo):

- `prism-app/` - The React frontend and Amplify Gen 2 backend definitions (`amplify/` folder).
- `services/` - The AWS SAM backend services (Python 3.12 Lambda functions for ingestion and assessment).
- `docs/` - Architectural documentation and domain models.
- `scripts/` - Utility scripts (e.g., database seeding).

## Environment & Naming Conventions

PRISM maintains strict environment separation using explicit naming:
- **Development (`dev`)**: 
  - Domain: [https://prism-dev.productradars.com](https://prism-dev.productradars.com)
  - Git Branch: `dev`
  - SAM Backend Stack: `prism-services-dev`
  - Cost Allocation Tag: `Environment=dev`
- **Production (`prod`)**: 
  - Domain: [https://prism.productradars.com](https://prism.productradars.com)
  - Git Branch: `master`
  - SAM Backend Stack: `prism-services-prod`
  - Cost Allocation Tag: `Environment=prod`

This ensures clear environment separation across both frontend web hosting and backend serverless infrastructure.

## Project Setup

### Prerequisites
- Node.js (>=20.0.0)
- Python 3.12
- AWS CLI configured with appropriate credentials
- AWS SAM CLI (for backend services)

### 1. Frontend & Core Data Setup (Amplify Gen 2)

Navigate to the `prism-app` directory to start the frontend:

```bash
cd prism-app
npm install

# Start the local development server
npm run dev
```

During local development, Amplify Gen 2 can provide a cloud sandbox environment for your auth and data resources. You can run the Amplify sandbox command (typically `npx ampx sandbox`) to deploy a temporary backend for testing.

### 2. Explicit Backend Services Setup (AWS SAM)

The asynchronous background workers are managed via AWS SAM using pre-configured profiles in `samconfig.toml`.

```bash
cd services

# Build the SAM application
sam build

# Deploy to Development (prism-services-dev)
sam deploy --config-env dev

# Deploy to Production (prism-services-prod)
sam deploy --config-env prod
```

`samconfig.toml` automatically handles environment parameter overrides (Alert Email, AI Limits, Bedrock Model ID) as well as cost allocation tags (`Project=Prism`, `Environment=dev|prod`).

## CI/CD Pipeline & AWS Amplify Integration

PRISM relies on **AWS Amplify Gen 2** for seamless continuous integration and continuous deployment (CI/CD) of the frontend and core backend resources. The deployment philosophy avoids excessive CI/CD complexity, keeping it simple and founder-operable.

### How it works:
1. **Repository Connection**: The project repository is connected to the AWS Amplify Console.
2. **Branch Deployments**: When code is pushed to a tracked branch (e.g., `main` for production, `dev` for development), Amplify automatically triggers a build.
3. **Full-Stack Build**: Amplify Gen 2 reads the `prism-app/amplify/` directory to deploy or update cloud resources (Cognito, DynamoDB tables via AppSync) using AWS CDK under the hood.
4. **Frontend Deployment**: After the backend resources are provisioned, Amplify builds the React frontend (`npm run build`) and hosts it on a global CDN.
5. **Environment Isolation**: Different git branches map to different backend environments (e.g., `prism-dev`, `prism-prod`), ensuring strict separation of data and resources.

*Note: The AWS SAM services (`services/`) are currently deployed separately to maintain low idle cost and operational simplicity. In a fully automated CI/CD setup, you can add GitHub Actions or AWS CodePipeline workflows to automatically run `sam build` and `sam deploy` alongside the Amplify deployments.*
