import { HelpSidebar } from "@/components/help";

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <HelpSidebar />
      <main className="flex-1 overflow-auto">
        <div className="container max-w-4xl py-8 px-4 md:px-8">{children}</div>
      </main>
    </div>
  );
}
