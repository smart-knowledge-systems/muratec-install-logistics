import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

export const maxDuration = 60;

const systemPrompt = `You are a product manager helping to create detailed Product Requirements Documents (PRDs) and user stories from feature descriptions.

When given a feature description, generate:

1. A comprehensive PRD in markdown format
2. User stories in JSON format

Format your response EXACTLY as follows:

---PRD_START---
# [Feature Title]

## Overview
[Brief description of the feature]

## Problem Statement
[What problem does this solve]

## Goals
- [Goal 1]
- [Goal 2]

## User Personas
[Who will use this feature]

## Functional Requirements
### Core Features
- [Requirement 1]
- [Requirement 2]

### User Flows
[Describe the main user flows]

## Non-Functional Requirements
- Performance: [requirements]
- Security: [requirements]
- Accessibility: [requirements]

## Success Metrics
- [Metric 1]
- [Metric 2]

## Out of Scope
- [What is NOT included]

## Open Questions
- [Any unresolved questions]
---PRD_END---

---STORIES_START---
[
  {
    "id": "US-001",
    "title": "Story title",
    "asA": "user role",
    "iWant": "what the user wants",
    "soThat": "the benefit/value",
    "acceptanceCriteria": [
      "Criterion 1",
      "Criterion 2"
    ],
    "priority": "high",
    "estimatedEffort": "M"
  }
]
---STORIES_END---

Important:
- Generate 3-7 user stories based on the feature complexity
- Use priority values: "high", "medium", or "low"
- Use estimatedEffort values: "XS", "S", "M", "L", or "XL"
- Ensure the JSON is valid and properly formatted
- Make user stories specific and actionable
- Keep acceptance criteria measurable and testable`;

export async function POST(req: Request) {
  try {
    const { description } = await req.json();

    if (!description || typeof description !== "string") {
      return new Response(
        JSON.stringify({ error: "Description is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const result = streamText({
      model: anthropic("claude-opus-4-5-20251101"),
      system: systemPrompt,
      prompt: `Generate a PRD and user stories for the following feature request:\n\n${description}`,
      temperature: 0.7,
      maxOutputTokens: 4096,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Error generating PRD:", error);
    return new Response(JSON.stringify({ error: "Failed to generate PRD" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
