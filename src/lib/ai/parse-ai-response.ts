import { z } from "zod";

export const UserStorySchema = z.object({
  id: z.string(),
  title: z.string(),
  asA: z.string(),
  iWant: z.string(),
  soThat: z.string(),
  acceptanceCriteria: z.array(z.string()),
  priority: z.enum(["high", "medium", "low"]),
  estimatedEffort: z.enum(["XS", "S", "M", "L", "XL"]).optional(),
});

export type UserStory = z.infer<typeof UserStorySchema>;

export const UserStoriesSchema = z.array(UserStorySchema);

export interface ParsedAIResponse {
  prd: string | null;
  userStories: UserStory[];
  isPrdComplete: boolean;
  isStoriesComplete: boolean;
  parseError: string | null;
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
              priority: ["high", "medium", "low"].includes(story.priority)
                ? story.priority
                : "medium",
              estimatedEffort: ["XS", "S", "M", "L", "XL"].includes(
                story.estimatedEffort,
              )
                ? story.estimatedEffort
                : undefined,
            }));
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
