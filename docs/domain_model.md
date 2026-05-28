# Core Domain Model

## Architectural Principle
PRISM separates raw source material, curated intelligence, structured entities, relationships, and export configurations. 

## Primary Domain Objects

1. **Source Definition**
   - Represents a monitored source (e.g., investor relations site, RSS feed, manually curated source).
   - Fields: ID, Name, SourceType, URL, Polling configuration, Default scoring hints.

2. **Source Item**
   - Ingestion/provenance data (not canonical intelligence). Represents a discovered candidate article.
   - Fields: Source URL, Publication timestamp, Extracted text, Raw AI outputs, Review status.
   - Lifecycle: discovered -> assessed -> reviewed -> rejected/published/duplicate.

3. **Knowledge Item (Canonical Truth)**
   - Represents canonical curated intelligence. Living intelligence records that remain editable after publication.
   - Fields: Title, Summary, Markdown body, Why It Matters, Key Facts, Reliability score, Significance score, Topics, Entity references.
   - Status: Draft, In Review, Published. "Published" means accepted into the AWS DB and available for export.

4. **Entity**
   - Structured business objects. Types are configurable (e.g., Operators, Studios, Brands, Regulators).
   - Fields: ID, EntityType, Name, Slug, Aliases.

5. **Relationship**
   - First-class records representing connections between entities (e.g., "Flutter owns FanDuel", "FanDuel operates_in Ontario").
   - Always confirmed by human reviewers (never fully autonomous in V1).

6. **Export Profile & Export Job**
   - Profiles define reusable rules for generating LLM-ready markdown bundles.
   - Jobs are lightweight execution logs for generated exports.
