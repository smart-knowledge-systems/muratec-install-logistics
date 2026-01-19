import { promises as fs } from "fs";
import path from "path";
import { notFound } from "next/navigation";
import { MarkdownContent } from "@/components/help";

const workflows = [
  "case-move-in",
  "inventory-verification",
  "parts-picking",
  "shipment-tracking",
  "project-scheduling",
  "evm-reporting",
] as const;

type Workflow = (typeof workflows)[number];

const workflowTitles: Record<Workflow, string> = {
  "case-move-in": "Case Move-In Workflow",
  "inventory-verification": "Inventory Verification Workflow",
  "parts-picking": "Parts Picking Workflow",
  "shipment-tracking": "Shipment Tracking Workflow",
  "project-scheduling": "Project Scheduling Workflow",
  "evm-reporting": "EVM Reporting Workflow",
};

export async function generateStaticParams() {
  return workflows.map((workflow) => ({ workflow }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ workflow: string }>;
}) {
  const { workflow } = await params;
  if (!workflows.includes(workflow as Workflow)) {
    return { title: "Not Found" };
  }

  return {
    title: `${workflowTitles[workflow as Workflow]} - Muratec Install Logistics`,
    description: `Step-by-step guide for ${workflowTitles[workflow as Workflow].replace(" Workflow", "")}`,
  };
}

async function getContent(workflow: string) {
  const filePath = path.join(
    process.cwd(),
    `docs/user-guide/workflows/${workflow}.md`,
  );
  try {
    const content = await fs.readFile(filePath, "utf8");
    return content;
  } catch {
    return null;
  }
}

export default async function WorkflowPage({
  params,
}: {
  params: Promise<{ workflow: string }>;
}) {
  const { workflow } = await params;

  if (!workflows.includes(workflow as Workflow)) {
    notFound();
  }

  const content = await getContent(workflow);

  if (!content) {
    notFound();
  }

  return <MarkdownContent content={content} />;
}
