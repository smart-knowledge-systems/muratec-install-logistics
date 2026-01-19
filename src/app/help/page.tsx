import { promises as fs } from "fs";
import path from "path";
import { MarkdownContent } from "@/components/help";

export const metadata = {
  title: "Help - Muratec Install Logistics",
  description: "User guides and documentation for Muratec Install Logistics",
};

async function getContent() {
  const filePath = path.join(process.cwd(), "docs/user-guide/index.md");
  const content = await fs.readFile(filePath, "utf8");
  return content;
}

export default async function HelpPage() {
  const content = await getContent();

  return <MarkdownContent content={content} />;
}
