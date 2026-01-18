"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TiptapEditor } from "@/components/ui/tiptap-editor";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Loader2, Check, AlertCircle } from "lucide-react";
import type { SaveStatus } from "@/hooks/use-auto-save";
import { extractPrdOverview } from "@/lib/ai/parse-ai-response";

interface PrdEditorProps {
  value: string;
  onChange: (value: string) => void;
  saveStatus?: SaveStatus;
  onBlur?: () => void;
  featureRequestId?: Id<"featureRequests">;
}

export function PrdEditor({
  value,
  onChange,
  saveStatus = "idle",
  onBlur,
  featureRequestId,
}: PrdEditorProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "edit">("preview");
  const [isExpanded, setIsExpanded] = useState(false);
  const incrementEventCount = useMutation(api.analytics.incrementEventCount);

  const handleReadMore = async () => {
    setIsExpanded(true);
    if (featureRequestId) {
      await incrementEventCount({
        featureRequestId,
        eventType: "prd_read_more",
      });
    }
  };

  const renderSaveIndicator = () => {
    if (saveStatus === "idle") return null;

    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {saveStatus === "saving" && (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Saving...</span>
          </>
        )}
        {saveStatus === "saved" && (
          <>
            <Check className="h-3 w-3 text-green-600" />
            <span className="text-green-600">Saved</span>
          </>
        )}
        {saveStatus === "error" && (
          <>
            <AlertCircle className="h-3 w-3 text-red-600" />
            <span className="text-red-600">Save failed</span>
          </>
        )}
      </div>
    );
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">PRD Editor</CardTitle>
          {renderSaveIndicator()}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "preview" | "edit")}
          className="flex-1 flex flex-col"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="edit">Edit</TabsTrigger>
          </TabsList>
          <TabsContent value="preview" className="flex-1 mt-4">
            <ScrollArea className="h-[500px] pr-4">
              {(() => {
                const overview = extractPrdOverview(value);
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
                          onClick={handleReadMore}
                        >
                          Read More
                        </Button>
                      </>
                    ) : (
                      <>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {value || "*No content yet*"}
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
              })()}
            </ScrollArea>
          </TabsContent>
          <TabsContent value="edit" className="flex-1 mt-4">
            <TiptapEditor
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              placeholder="Enter PRD content in markdown format..."
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
