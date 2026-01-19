"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { extractPrdOverview } from "@/lib/ai/parse-ai-response";

interface PrdDisplayProps {
  content: string;
  featureRequestId?: Id<"featureRequests">;
}

export function PrdDisplay({ content, featureRequestId }: PrdDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const incrementEventCount = useMutation(api.analytics.incrementEventCount);
  const overview = extractPrdOverview(content);
  const showCondensed = !isExpanded && overview.hasMore;

  const handleReadMore = async () => {
    setIsExpanded(true);
    if (featureRequestId) {
      await incrementEventCount({
        featureRequestId,
        eventType: "prd_read_more",
      });
    }
  };

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      {showCondensed ? (
        <>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {`# ${overview.title}\n\n${overview.overview}`}
          </ReactMarkdown>
          <Button
            variant="link"
            className="mt-4 p-0 h-auto"
            onClick={handleReadMore}
          >
            Read More
          </Button>
        </>
      ) : (
        <>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content || "*No content yet*"}
          </ReactMarkdown>
          {overview.hasMore && (
            <Button
              variant="link"
              className="mt-4 p-0 h-auto"
              onClick={() => setIsExpanded(false)}
            >
              Show Less
            </Button>
          )}
        </>
      )}
    </div>
  );
}
