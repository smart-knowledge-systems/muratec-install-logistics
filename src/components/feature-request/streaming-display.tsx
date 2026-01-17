"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { UserStory } from "@/lib/ai/parse-ai-response";

interface StreamingDisplayProps {
  prd: string | null;
  userStories: UserStory[];
  isPrdComplete: boolean;
  isStoriesComplete: boolean;
  isLoading: boolean;
}

export function StreamingDisplay({
  prd,
  userStories,
  isPrdComplete,
  isStoriesComplete,
  isLoading,
}: StreamingDisplayProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-medium">
            Product Requirements Document
          </CardTitle>
          {isPrdComplete ? (
            <Badge variant="default">Complete</Badge>
          ) : isLoading ? (
            <Badge variant="secondary">Generating...</Badge>
          ) : null}
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            {prd ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{prd}</ReactMarkdown>
              </div>
            ) : isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-6 w-1/2 mt-4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ) : (
              <p className="text-muted-foreground">
                PRD will appear here as it&apos;s generated...
              </p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-medium">User Stories</CardTitle>
          {isStoriesComplete ? (
            <Badge variant="default">
              {userStories.length} {userStories.length === 1 ? "story" : "stories"}
            </Badge>
          ) : isLoading && isPrdComplete ? (
            <Badge variant="secondary">Generating...</Badge>
          ) : null}
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            {userStories.length > 0 ? (
              <div className="space-y-4">
                {userStories.map((story) => (
                  <div
                    key={story.id}
                    className="rounded-lg border bg-card p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-muted-foreground">
                        {story.id}
                      </span>
                      <div className="flex gap-2">
                        <Badge
                          variant={
                            story.priority === "high"
                              ? "destructive"
                              : story.priority === "medium"
                                ? "default"
                                : "secondary"
                          }
                        >
                          {story.priority}
                        </Badge>
                        {story.estimatedEffort && (
                          <Badge variant="outline">{story.estimatedEffort}</Badge>
                        )}
                      </div>
                    </div>
                    <h4 className="font-medium">{story.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      As a <span className="font-medium">{story.asA}</span>, I
                      want <span className="font-medium">{story.iWant}</span>, so
                      that <span className="font-medium">{story.soThat}</span>.
                    </p>
                    {story.acceptanceCriteria.length > 0 && (
                      <div className="text-sm">
                        <p className="font-medium text-muted-foreground mb-1">
                          Acceptance Criteria:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                          {story.acceptanceCriteria.map((criterion, index) => (
                            <li key={index}>{criterion}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">
                User stories will appear here as they&apos;re generated...
              </p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
