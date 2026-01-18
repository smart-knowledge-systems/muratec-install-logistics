"use client";

import { Editor } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "./button";
import {
  Bold,
  Italic,
  Code,
  List,
  ListOrdered,
  Heading1,
  Heading2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingToolbarProps {
  editor: Editor;
}

export function FloatingToolbar({ editor }: FloatingToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateToolbar = () => {
      const { from, to } = editor.state.selection;
      const hasSelection = from !== to;

      if (!hasSelection) {
        setIsVisible(false);
        return;
      }

      // Get the DOM coordinates for the selection
      const { view } = editor;
      const start = view.coordsAtPos(from);
      const end = view.coordsAtPos(to);

      if (toolbarRef.current) {
        const toolbarWidth = toolbarRef.current.offsetWidth;
        const toolbarHeight = toolbarRef.current.offsetHeight;

        // Position toolbar centered above the selection
        const left = (start.left + end.left) / 2 - toolbarWidth / 2;
        const top = start.top - toolbarHeight - 8; // 8px gap above selection

        setPosition({ top, left });
        setIsVisible(true);
      }
    };

    editor.on("selectionUpdate", updateToolbar);
    editor.on("update", updateToolbar);

    return () => {
      editor.off("selectionUpdate", updateToolbar);
      editor.off("update", updateToolbar);
    };
  }, [editor]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      ref={toolbarRef}
      className={cn(
        "fixed z-50 flex items-center gap-1 rounded-md border bg-popover p-1 shadow-md",
        "animate-in fade-in-0 zoom-in-95",
      )}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={cn(
          editor.isActive("bold") &&
            "bg-accent text-accent-foreground dark:bg-accent/50",
        )}
        title="Bold (Ctrl+B)"
      >
        <Bold />
      </Button>

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={cn(
          editor.isActive("italic") &&
            "bg-accent text-accent-foreground dark:bg-accent/50",
        )}
        title="Italic (Ctrl+I)"
      >
        <Italic />
      </Button>

      <div className="mx-1 h-6 w-px bg-border" />

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={cn(
          editor.isActive("heading", { level: 1 }) &&
            "bg-accent text-accent-foreground dark:bg-accent/50",
        )}
        title="Heading 1 (Ctrl+Shift+1)"
      >
        <Heading1 />
      </Button>

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={cn(
          editor.isActive("heading", { level: 2 }) &&
            "bg-accent text-accent-foreground dark:bg-accent/50",
        )}
        title="Heading 2 (Ctrl+Shift+2)"
      >
        <Heading2 />
      </Button>

      <div className="mx-1 h-6 w-px bg-border" />

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={cn(
          editor.isActive("bulletList") &&
            "bg-accent text-accent-foreground dark:bg-accent/50",
        )}
        title="Bullet List"
      >
        <List />
      </Button>

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={cn(
          editor.isActive("orderedList") &&
            "bg-accent text-accent-foreground dark:bg-accent/50",
        )}
        title="Numbered List"
      >
        <ListOrdered />
      </Button>

      <div className="mx-1 h-6 w-px bg-border" />

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={cn(
          editor.isActive("code") &&
            "bg-accent text-accent-foreground dark:bg-accent/50",
        )}
        title="Code"
      >
        <Code />
      </Button>
    </div>
  );
}
