import { PwbsDependencyEditor } from "@/components/projects/pwbs-dependency-editor";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ projectNumber: string }>;
}) {
  const { projectNumber } = await params;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Project Settings</h1>
        <p className="text-muted-foreground">
          Configure dependencies and scheduling rules for project{" "}
          {projectNumber}
        </p>
      </div>

      <PwbsDependencyEditor projectNumber={projectNumber} />
    </div>
  );
}
