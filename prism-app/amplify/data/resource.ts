import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/*== STEP 1 ===============================================================
The section below creates a Todo database table with a "content" field. Try
adding a new "isDone" field as a boolean. The authorization rule below
specifies that any unauthenticated user can "create", "read", "update", 
and "delete" any "Todo" records.
=========================================================================*/
const schema = a.schema({
  SourceDefinition: a.model({
    name: a.string().required(),
    sourceType: a.enum(['INVESTOR_RELATIONS', 'PRESS_RELEASE', 'NEWS_SITE', 'REGULATOR', 'RSS', 'MANUAL']),
    url: a.string().required(),
    pollingConfig: a.string(),
    active: a.boolean(),
    domainConfig: a.string(),
    defaultScoringHints: a.string(),
    tags: a.string().array(),
  }).authorization(allow => [allow.authenticated()]),

  SourceItem: a.model({
    sourceDefinitionId: a.id(),
    url: a.string().required(),
    title: a.string(),
    publicationDate: a.datetime(),
    content: a.string(),
    rawAIOutput: a.string(),
    aiAssessmentMetadata: a.string(),
    status: a.enum(['DISCOVERED', 'ASSESSED', 'REVIEWED', 'REJECTED', 'PUBLISHED', 'DUPLICATE', 'FAILED']),
    reviewer: a.string(),
    reviewTimestamp: a.datetime(),
    duplicateReferences: a.string().array(),
  }).authorization(allow => [allow.authenticated()]),

  KnowledgeItem: a.model({
    sourceItemId: a.id(),
    title: a.string().required(),
    summary: a.string(),
    markdownBody: a.string(),
    whyItMatters: a.string(),
    keyFacts: a.string().array(),
    reliabilityScore: a.integer(),
    significanceScore: a.integer(),
    topics: a.string().array(),
    status: a.enum(['DRAFT', 'IN_REVIEW', 'PUBLISHED']),
    createdBy: a.string(),
    updatedBy: a.string(),
  }).authorization(allow => [allow.authenticated()]),

  Entity: a.model({
    name: a.string().required(),
    slug: a.string(),
    type: a.enum(['OPERATOR', 'STUDIO', 'BRAND', 'AGGREGATOR', 'REGULATOR', 'JURISDICTION', 'STRATEGIC_TOPIC', 'PERSON', 'ORGANIZATION']),
    description: a.string(),
    aliases: a.string().array(),
    metadata: a.string(),
    active: a.boolean(),
  }).authorization(allow => [allow.authenticated()]),

  Relationship: a.model({
    sourceEntityId: a.id().required(),
    targetEntityId: a.id().required(),
    relationshipType: a.string().required(),
    description: a.string(),
    confidence: a.integer(),
    supportingKnowledgeItems: a.string().array(),
    createdBy: a.string(),
  }).authorization(allow => [allow.authenticated()]),

  ExportProfile: a.model({
    name: a.string().required(),
    description: a.string(),
    filters: a.string(),
    groupingRules: a.string(),
    outputFormat: a.enum(['SINGLE_MARKDOWN', 'MULTIPLE_MARKDOWN', 'THEMATIC_ZIP']),
    fileSplittingRules: a.string(),
    destinationConfig: a.string(),
  }).authorization(allow => [allow.authenticated()]),

  ExportJob: a.model({
    exportProfileId: a.id().required(),
    triggeredBy: a.string(),
    generatedAt: a.datetime(),
    status: a.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED']),
    outputLocation: a.string(),
    errorInformation: a.string(),
  }).authorization(allow => [allow.authenticated()]),

  // These custom mutations require custom Lambda handlers. 
  // We will uncomment them once we configure the SAM Lambda integrations in amplify/backend.ts!
  // triggerIngestion: a.mutation()
  //   .arguments({ sourceUrl: a.string().required() })
  //   .returns(a.string())
  //   .authorization(allow => [allow.authenticated()]),
  // 
  // regenerateAI: a.mutation()
  //   .arguments({ sourceItemId: a.string().required(), promptVersion: a.string().required() })
  //   .returns(a.string())
  //   .authorization(allow => [allow.authenticated()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});

/*== STEP 2 ===============================================================
Go to your frontend source code. From your client-side code, generate a
Data client to make CRUDL requests to your table. (THIS SNIPPET WILL ONLY
WORK IN THE FRONTEND CODE FILE.)

Using JavaScript or Next.js React Server Components, Middleware, Server 
Actions or Pages Router? Review how to generate Data clients for those use
cases: https://docs.amplify.aws/gen2/build-a-backend/data/connect-to-API/
=========================================================================*/

/*
"use client"
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>() // use this Data client for CRUDL requests
*/

/*== STEP 3 ===============================================================
Fetch records from the database and use them in your frontend component.
(THIS SNIPPET WILL ONLY WORK IN THE FRONTEND CODE FILE.)
=========================================================================*/

/* For example, in a React component, you can use this snippet in your
  function's RETURN statement */
// const { data: todos } = await client.models.Todo.list()

// return <ul>{todos.map(todo => <li key={todo.id}>{todo.content}</li>)}</ul>
