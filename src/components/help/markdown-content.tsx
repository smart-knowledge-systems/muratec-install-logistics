"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div
      className={cn(
        "prose prose-neutral dark:prose-invert max-w-none",
        // Headings
        "prose-headings:font-semibold prose-headings:tracking-tight",
        "prose-h1:text-3xl prose-h1:border-b prose-h1:pb-2 prose-h1:mb-4",
        "prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4",
        "prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3",
        // Paragraphs and lists
        "prose-p:leading-relaxed",
        "prose-li:my-1",
        "prose-ul:my-4 prose-ol:my-4",
        // Code blocks
        "prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-sm",
        "prose-pre:bg-muted prose-pre:border prose-pre:rounded-lg",
        // Links
        "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        // Blockquotes
        "prose-blockquote:border-l-4 prose-blockquote:border-primary/50 prose-blockquote:pl-4 prose-blockquote:italic",
        // Task lists
        "[&_input[type=checkbox]]:mr-2 [&_input[type=checkbox]]:accent-primary",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
