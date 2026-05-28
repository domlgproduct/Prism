# Core Workflows

**Primary Pipeline:** Discover source material -> AI assess and summarise -> human review and score -> publish into structured knowledge base -> export to LLM-ready formats.

## 1. Source Discovery
Continuously gather potentially relevant source material using scheduled polling, lightweight ingestion jobs, and manual URLs. Maximizes coverage while keeping cost low.

## 2. Source Ingestion
Convert source material into structured candidate Source Items. Extracts clean readable text and metadata. Does not retain raw HTML snapshots or full web archives in V1.

## 3. AI Assessment
Use a cost-effective Bedrock LLM to create structured candidate intelligence (title, summary, why it matters, key facts, suggested entities/relationships). AI suggestions are advisory only. No autonomous publishing.

## 4. Review Queue (Human-in-the-Loop)
Fast triage via a mobile-first interface.
- Swipe/button left = reject.
- Swipe/button right = accept.
Accepting opens a lightweight editor modal to confirm scores, entities, and publish status. Reviewers can manually regenerate AI outputs.

## 5. Knowledge Publication
Convert reviewed draft content into canonical Knowledge Items. Publishing means the item is searchable and exportable, but it remains editable and can accumulate additional source items over time.

## 6. Export Generation
Generate markdown-first knowledge bundles for LLM systems. Exports are disposable, regenerative artifacts. Targets include NotebookLM, GitHub, S3, or specific executive briefings.
