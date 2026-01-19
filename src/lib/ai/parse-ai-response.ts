import { z } from "zod";
import { PRIORITY_VALUES, EFFORT_VALUES } from "./types";

export const UserStorySchema = z.object({
  id: z.string(),
  title: z.string(),
  asA: z.string(),
  iWant: z.string(),
  soThat: z.string(),
  acceptanceCriteria: z.array(z.string()),
  priority: z.enum(PRIORITY_VALUES),
  estimatedEffort: z.enum(EFFORT_VALUES).optional(),
});

export type UserStory = z.infer<typeof UserStorySchema>;

export const UserStoriesSchema = z.array(UserStorySchema);

export interface ParsedAIResponse {
  prd: string | null;
  userStories: UserStory[];
  isPrdComplete: boolean;
  isStoriesComplete: boolean;
  parseError: string | null;
  parseWarning: string | null;
}

const PRD_START = "---PRD_START---";
const PRD_END = "---PRD_END---";
const STORIES_START = "---STORIES_START---";
const STORIES_END = "---STORIES_END---";

export function parseAIResponse(content: string): ParsedAIResponse {
  const result: ParsedAIResponse = {
    prd: null,
    userStories: [],
    isPrdComplete: false,
    isStoriesComplete: false,
    parseError: null,
    parseWarning: null,
  };

  // Extract PRD
  const prdStartIndex = content.indexOf(PRD_START);
  const prdEndIndex = content.indexOf(PRD_END);

  if (prdStartIndex !== -1) {
    if (prdEndIndex !== -1 && prdEndIndex > prdStartIndex) {
      result.prd = content
        .slice(prdStartIndex + PRD_START.length, prdEndIndex)
        .trim();
      result.isPrdComplete = true;
    } else {
      // PRD started but not complete
      result.prd = content.slice(prdStartIndex + PRD_START.length).trim();
    }
  }

  // Extract User Stories
  const storiesStartIndex = content.indexOf(STORIES_START);
  const storiesEndIndex = content.indexOf(STORIES_END);

  if (storiesStartIndex !== -1) {
    let storiesJson: string;

    if (storiesEndIndex !== -1 && storiesEndIndex > storiesStartIndex) {
      storiesJson = content
        .slice(storiesStartIndex + STORIES_START.length, storiesEndIndex)
        .trim();
      result.isStoriesComplete = true;
    } else {
      // Stories started but not complete
      storiesJson = content
        .slice(storiesStartIndex + STORIES_START.length)
        .trim();
    }

    if (result.isStoriesComplete && storiesJson) {
      try {
        const parsed = JSON.parse(storiesJson);
        const validated = UserStoriesSchema.safeParse(parsed);

        if (validated.success) {
          result.userStories = validated.data;
        } else {
          result.parseError = `Invalid user stories format: ${validated.error.message}`;
          // Try to use the parsed data anyway if it's an array
          if (Array.isArray(parsed)) {
            result.userStories = parsed.map((story, index) => ({
              id: story.id ?? `US-${String(index + 1).padStart(3, "0")}`,
              title: story.title ?? "Untitled Story",
              asA: story.asA ?? "",
              iWant: story.iWant ?? "",
              soThat: story.soThat ?? "",
              acceptanceCriteria: Array.isArray(story.acceptanceCriteria)
                ? story.acceptanceCriteria
                : [],
              priority: ([...PRIORITY_VALUES] as string[]).includes(
                story.priority,
              )
                ? story.priority
                : "medium",
              estimatedEffort: ([...EFFORT_VALUES] as string[]).includes(
                story.estimatedEffort,
              )
                ? story.estimatedEffort
                : undefined,
            }));
            // Preserve as warning so UI can display data quality issue
            result.parseWarning = result.parseError;
            result.parseError = null;
          }
        }
      } catch {
        result.parseError = "Failed to parse user stories JSON";
      }
    }
  }

  return result;
}

export function extractTitleFromPrd(prd: string): string {
  const lines = prd.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("# ")) {
      return trimmed.slice(2).trim();
    }
  }
  return "Untitled Feature Request";
}

export interface PrdOverview {
  title: string;
  overview: string;
  hasMore: boolean;
}

/**
 * Extracts title and overview from PRD markdown content.
 * @param prd - The markdown PRD content
 * @returns Object with title (first H1/H2), overview (first paragraph), and hasMore flag
 */
export function extractPrdOverview(prd: string): PrdOverview {
  if (!prd || prd.trim() === "") {
    return {
      title: "Untitled Feature Request",
      overview: "",
      hasMore: false,
    };
  }

  const lines = prd.split("\n");
  let title = "";
  let overview = "";
  let foundTitle = false;
  let foundOverview = false;
  let contentAfterOverview = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Extract title (first H1 or H2)
    if (
      !foundTitle &&
      (trimmed.startsWith("# ") || trimmed.startsWith("## "))
    ) {
      if (trimmed.startsWith("# ")) {
        title = trimmed.slice(2).trim();
      } else {
        title = trimmed.slice(3).trim();
      }
      foundTitle = true;
      continue;
    }

    // Extract overview (first non-empty paragraph after title)
    if (foundTitle && !foundOverview && trimmed.length > 0) {
      // Skip if it's another heading
      if (trimmed.startsWith("#")) {
        continue;
      }

      overview = trimmed;
      foundOverview = true;
      continue;
    }

    // Check if there's more content after overview
    if (foundOverview && trimmed.length > 0) {
      contentAfterOverview = true;
      break;
    }
  }

  return {
    title: title || "Untitled Feature Request",
    overview: overview,
    hasMore: contentAfterOverview,
  };
}
