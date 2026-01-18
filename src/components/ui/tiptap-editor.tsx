"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown, type MarkdownStorage } from "tiptap-markdown";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

// Extend editor storage type to include the markdown extension storage
interface EditorStorageWithMarkdown {
  markdown: MarkdownStorage;
}

interface TiptapEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
}

export function TiptapEditor({
  value,
  onChange,
  onBlur,
  placeholder = "Start typing...",
  className,
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none",
          "min-h-[500px] w-full rounded-md border border-input bg-transparent px-3 py-2",
          "focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring",
          "dark:bg-input/30",
          className,
        ),
      },
    },
    onUpdate: ({ editor }) => {
      const storage = editor.storage as unknown as EditorStorageWithMarkdown;
      onChange(storage.markdown.getMarkdown());
    },
    onBlur: () => {
      onBlur?.();
    },
  });

  // Update editor content when value prop changes externally
  useEffect(() => {
    if (editor) {
      const storage = editor.storage as unknown as EditorStorageWithMarkdown;
      if (value !== storage.markdown.getMarkdown()) {
        editor.commands.setContent(value);
      }
    }
  }, [value, editor]);

  return <EditorContent editor={editor} />;
}
