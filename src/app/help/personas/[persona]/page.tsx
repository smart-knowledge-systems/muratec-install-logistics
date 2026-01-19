import { promises as fs } from "fs";
import path from "path";
import { notFound } from "next/navigation";
import { MarkdownContent } from "@/components/help";

const personas = [
  "field-worker",
  "site-manager",
  "project-scheduler",
  "project-manager",
  "import-coordinator",
  "warehouse-manager",
  "installer",
] as const;

type Persona = (typeof personas)[number];

const personaTitles: Record<Persona, string> = {
  "field-worker": "Field Worker Guide",
  "site-manager": "Site Manager Guide",
  "project-scheduler": "Project Scheduler Guide",
  "project-manager": "Project Manager Guide",
  "import-coordinator": "Import Coordinator Guide",
  "warehouse-manager": "Warehouse Manager Guide",
  installer: "Installer Guide",
};

export async function generateStaticParams() {
  return personas.map((persona) => ({ persona }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ persona: string }>;
}) {
  const { persona } = await params;
  if (!personas.includes(persona as Persona)) {
    return { title: "Not Found" };
  }

  return {
    title: `${personaTitles[persona as Persona]} - Muratec Install Logistics`,
    description: `User guide for ${personaTitles[persona as Persona].replace(" Guide", "")} role`,
  };
}

async function getContent(persona: string) {
  const filePath = path.join(
    process.cwd(),
    `docs/user-guide/personas/${persona}.md`,
  );
  try {
    const content = await fs.readFile(filePath, "utf8");
    return content;
  } catch {
    return null;
  }
}

export default async function PersonaPage({
  params,
}: {
  params: Promise<{ persona: string }>;
}) {
  const { persona } = await params;

  if (!personas.includes(persona as Persona)) {
    notFound();
  }

  const content = await getContent(persona);

  if (!content) {
    notFound();
  }

  return <MarkdownContent content={content} />;
}
