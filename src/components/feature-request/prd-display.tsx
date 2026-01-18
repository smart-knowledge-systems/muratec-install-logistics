"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { extractPrdOverview } from "@/lib/ai/parse-ai-response";

interface PrdDisplayProps {
  content: string;
}

export function PrdDisplay({ content }: PrdDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const overview = extractPrdOverview(content);
  const showCondensed = !isExpanded && overview.hasMore;

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
            onClick={() => setIsExpanded(true)}
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
