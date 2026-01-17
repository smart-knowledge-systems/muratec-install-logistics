"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PrdEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function PrdEditor({ value, onChange }: PrdEditorProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "edit">("preview");

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">PRD Editor</CardTitle>
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
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {value || "*No content yet*"}
                </ReactMarkdown>
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="edit" className="flex-1 mt-4">
            <Textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="h-[500px] font-mono text-sm resize-none"
              placeholder="Enter PRD content in markdown format..."
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
