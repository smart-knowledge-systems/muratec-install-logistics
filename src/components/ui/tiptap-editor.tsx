"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown, type MarkdownStorage } from "tiptap-markdown";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { FloatingToolbar } from "./tiptap-floating-toolbar";

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
          // Keyboard shortcuts for headings are automatically configured:
          // Ctrl/Cmd+Alt+1 through Ctrl/Cmd+Alt+6 for heading levels
          // However, we want Ctrl/Cmd+Shift+1 and Ctrl/Cmd+Shift+2
          // These need to be added via custom keyboard shortcuts
        },
        // Bold (Ctrl/Cmd+B) and Italic (Ctrl/Cmd+I) are included by default
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
      handleKeyDown: (_view, event) => {
        // Custom keyboard shortcuts for headings
        if ((event.metaKey || event.ctrlKey) && event.shiftKey) {
          if (event.key === "1" || event.key === "!") {
            event.preventDefault();
            editor?.chain().focus().toggleHeading({ level: 1 }).run();
            return true;
          }
          if (event.key === "2" || event.key === "@") {
            event.preventDefault();
            editor?.chain().focus().toggleHeading({ level: 2 }).run();
            return true;
          }
        }
        return false;
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

  return (
    <div className="relative">
      <EditorContent editor={editor} />
      {editor && <FloatingToolbar editor={editor} />}
    </div>
  );
}
