import { PwbsDependencyEditor } from "@/components/projects/pwbs-dependency-editor";

export default function DefaultDependenciesPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Default PWBS Dependencies</h1>
        <p className="text-muted-foreground">
          Define default dependencies that apply to all projects unless
          overridden.
        </p>
      </div>

      <PwbsDependencyEditor />
    </div>
  );
}
