"use client";

import { use } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { PrdDisplay } from "@/components/feature-request/prd-display";
import Link from "next/link";

type Status =
  | "draft"
  | "submitted"
  | "in_review"
  | "approved"
  | "rejected"
  | "in_progress"
  | "completed";

interface AdminFeatureRequestDetailContentProps {
  id: string;
}

function AdminFeatureRequestDetailContent({
  id,
}: AdminFeatureRequestDetailContentProps) {
  const { user, logout } = useAuth();
  const featureRequest = useQuery(api.featureRequests.get, {
    id: id as Id<"featureRequests">,
  });
  const updateStatus = useMutation(api.featureRequests.updateStatus);
  const deleteRequest = useMutation(api.featureRequests.remove);

  const handleStatusChange = async (newStatus: Status) => {
    try {
      await updateStatus({
        id: id as Id<"featureRequests">,
        status: newStatus,
      });
      toast.success(`Status updated to ${newStatus.replace("_", " ")}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this feature request?")) {
      return;
    }
    try {
      await deleteRequest({ id: id as Id<"featureRequests"> });
      toast.success("Feature request deleted");
      window.location.href = "/admin/feature-requests";
    } catch {
      toast.error("Failed to delete feature request");
    }
  };

  if (featureRequest === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-8 w-32" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (featureRequest === null) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4">
            <Link href="/admin/feature-requests">
              <Button variant="ghost">&larr; Back</Button>
            </Link>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold">Feature Request Not Found</h1>
            <p className="text-muted-foreground mt-2">
              The requested feature request does not exist.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const statusColor = {
    draft: "secondary",
    submitted: "default",
    in_review: "default",
    approved: "default",
    rejected: "destructive",
    in_progress: "default",
    completed: "default",
  } as const;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/feature-requests">
              <Button variant="ghost">&larr; Back</Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">{featureRequest.title}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={statusColor[featureRequest.status]}>
                  {featureRequest.status.replace("_", " ")}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  by {featureRequest.authorEmail}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={logout}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Admin Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Status:</label>
                <Select
                  value={featureRequest.status}
                  onValueChange={(v) => handleStatusChange(v as Status)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="in_review">In Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator orientation="vertical" className="h-8" />
              <div className="text-sm text-muted-foreground">
                Created: {formatDate(featureRequest.createdAt)}
              </div>
              <div className="text-sm text-muted-foreground">
                Updated: {formatDate(featureRequest.updatedAt)}
              </div>
              <div className="ml-auto">
                <Button variant="destructive" size="sm" onClick={handleDelete}>
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Product Requirements Document</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <PrdDisplay content={featureRequest.prdContent} />
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                User Stories ({featureRequest.userStories.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-4">
                  {featureRequest.userStories.map((story) => (
                    <div
                      key={story.id}
                      className="rounded-lg border bg-card p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-muted-foreground">
                          {story.id}
                        </span>
                        <div className="flex gap-2">
                          <Badge
                            variant={
                              story.priority === "high"
                                ? "destructive"
                                : story.priority === "medium"
                                  ? "default"
                                  : "secondary"
                            }
                          >
                            {story.priority}
                          </Badge>
                          {story.estimatedEffort && (
                            <Badge variant="outline">
                              {story.estimatedEffort}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <h4 className="font-medium">{story.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        As a <span className="font-medium">{story.asA}</span>, I
                        want <span className="font-medium">{story.iWant}</span>,
                        so that{" "}
                        <span className="font-medium">{story.soThat}</span>.
                      </p>
                      {story.acceptanceCriteria.length > 0 && (
                        <div className="text-sm">
                          <p className="font-medium text-muted-foreground mb-1">
                            Acceptance Criteria:
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                            {story.acceptanceCriteria.map(
                              (criterion, index) => (
                                <li key={index}>{criterion}</li>
                              ),
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Original Request</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {featureRequest.description}
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function AdminFeatureRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <AuthGuard requireAdmin>
      <AdminFeatureRequestDetailContent id={id} />
    </AuthGuard>
  );
}
