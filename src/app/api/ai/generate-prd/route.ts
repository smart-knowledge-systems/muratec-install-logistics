import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

export const maxDuration = 60;

// Request validation schema
const GeneratePrdRequestSchema = z.object({
  description: z.string().min(1, "Description is required").max(10000),
  authorEmail: z.string().email().optional(),
  isRefinement: z.boolean().default(false),
  prompts: z
    .array(
      z.object({
        content: z.string(),
        createdAt: z.number(),
      }),
    )
    .max(50)
    .default([]),
  currentPrd: z.string().max(50000).default(""),
  currentStories: z.string().max(50000).default(""),
});

const MAX_PROMPTS_IN_CONTEXT = 10;

const baseSystemPrompt = `You are a product manager helping to create detailed Product Requirements Documents (PRDs) and user stories from feature descriptions.

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

function buildSystemPrompt(
  isRefinement: boolean,
  prompts: Array<{ content: string; createdAt: number }>,
  currentPrd: string,
  currentStories: string,
): string {
  if (!isRefinement) {
    return baseSystemPrompt;
  }

  let refinementPrompt = baseSystemPrompt + "\n\n---\n\n";
  refinementPrompt += "**REFINEMENT MODE**\n\n";
  refinementPrompt +=
    "You are refining an existing PRD and user stories based on additional user feedback.\n\n";

  if (prompts.length > 0) {
    // Limit to last N prompts to prevent context overflow
    const recentPrompts = prompts.slice(-MAX_PROMPTS_IN_CONTEXT);
    if (recentPrompts.length < prompts.length) {
      refinementPrompt += `*Note: Showing ${recentPrompts.length} of ${prompts.length} refinement instructions*\n\n`;
    }
    refinementPrompt += "**Previous Instructions:**\n";
    recentPrompts.forEach((prompt, index) => {
      const date = new Date(prompt.createdAt).toISOString();
      refinementPrompt += `${index + 1}. [${date}] ${prompt.content}\n`;
    });
    refinementPrompt += "\n";
  }

  if (currentPrd) {
    refinementPrompt += "**Current PRD:**\n```markdown\n";
    refinementPrompt += currentPrd;
    refinementPrompt += "\n```\n\n";
  }

  if (currentStories) {
    refinementPrompt += "**Current User Stories:**\n```json\n";
    refinementPrompt += currentStories;
    refinementPrompt += "\n```\n\n";
  }

  refinementPrompt +=
    "Please update the PRD and user stories based on the new refinement instruction. ";
  refinementPrompt +=
    "Maintain the same format (---PRD_START---, ---PRD_END---, ---STORIES_START---, ---STORIES_END---).";

  return refinementPrompt;
}

export async function POST(req: Request) {
  const startTime = Date.now();
  const requestId = `req_${startTime}_${Math.random().toString(36).substring(2, 9)}`;

  try {
    const body = await req.json();

    // Validate request body with Zod
    const parseResult = GeneratePrdRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMessage =
        parseResult.error.issues[0]?.message ?? "Invalid request";
      console.error(
        `[${new Date().toISOString()}] [${requestId}] Validation Error:`,
        parseResult.error.issues,
      );
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const {
      description,
      authorEmail,
      isRefinement,
      prompts,
      currentPrd,
      currentStories,
    } = parseResult.data;

    // Log request start with metadata
    console.log(
      `[${new Date().toISOString()}] [${requestId}] PRD Generation Request Started`,
      {
        authorEmail: authorEmail ?? "unknown",
        isRefinement,
        promptCount: prompts.length,
        hasDescription: !!description,
      },
    );

    const systemPrompt = buildSystemPrompt(
      isRefinement,
      prompts,
      currentPrd,
      currentStories,
    );

    const userPrompt = isRefinement
      ? `Refinement instruction:\n\n${description}`
      : `Generate a PRD and user stories for the following feature request:\n\n${description}`;

    const result = streamText({
      model: anthropic("claude-sonnet-4-5"),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.7,
      maxOutputTokens: 4096,
      onError({ error }) {
        console.error(
          `[${new Date().toISOString()}] [${requestId}] Stream error:`,
          error,
        );
      },
    });

    // Log successful stream initiation
    const duration = Date.now() - startTime;
    console.log(
      `[${new Date().toISOString()}] [${requestId}] Stream Initiated (${duration}ms)`,
    );

    return result.toUIMessageStreamResponse();
  } catch (error) {
    const duration = Date.now() - startTime;

    // Log errors with full context
    console.error(
      `[${new Date().toISOString()}] [${requestId}] Error generating PRD (${duration}ms)`,
      {
        error:
          error instanceof Error
            ? {
                message: error.message,
                stack: error.stack,
                name: error.name,
              }
            : String(error),
        duration,
      },
    );

    return new Response(JSON.stringify({ error: "Failed to generate PRD" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
