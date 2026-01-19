import { promises as fs } from "fs";
import path from "path";
import { MarkdownContent } from "@/components/help";

export const metadata = {
  title: "Navigation Guide - Muratec Install Logistics",
  description: "How to navigate the Muratec Install Logistics application",
};

async function getContent() {
  const filePath = path.join(process.cwd(), "docs/user-guide/navigation.md");
  const content = await fs.readFile(filePath, "utf8");
  return content;
}

export default async function NavigationHelpPage() {
  const content = await getContent();

  return <MarkdownContent content={content} />;
}
