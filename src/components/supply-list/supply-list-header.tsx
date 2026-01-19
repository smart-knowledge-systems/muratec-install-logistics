"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SupplyListHeaderProps {
  user: { email: string; role: string } | null;
  logout: () => void;
  availableProjects: string[];
  selectedProject?: string;
  onProjectChange: (projectNumber: string | undefined) => void;
}

export function SupplyListHeader({
  user,
  logout,
  availableProjects,
  selectedProject,
  onProjectChange,
}: SupplyListHeaderProps) {
  const handleProjectChange = (value: string) => {
    if (value === "all") {
      onProjectChange(undefined);
    } else {
      onProjectChange(value);
    }
  };

  return (
    <header className="border-b bg-background sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold">Supply List</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Track equipment and materials
            </p>
          </div>

          {/* Project switcher */}
          <Select
            value={selectedProject || "all"}
            onValueChange={handleProjectChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {availableProjects.map((projectNumber) => (
                <SelectItem key={projectNumber} value={projectNumber}>
                  Project {projectNumber}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {user?.email}
          </span>
          {user?.role === "admin" && (
            <Link href="/admin/feature-requests">
              <Button variant="outline" size="sm">
                Admin
              </Button>
            </Link>
          )}
          <Button variant="ghost" size="sm" onClick={logout}>
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
}
