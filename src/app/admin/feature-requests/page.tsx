"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

type StatusFilter =
  | "all"
  | "draft"
  | "submitted"
  | "in_review"
  | "approved"
  | "rejected"
  | "in_progress"
  | "completed";

function AdminFeatureRequestsContent() {
  const { user, logout } = useAuth();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const featureRequests = useQuery(api.featureRequests.listAll, {
    status:
      statusFilter === "all"
        ? undefined
        : (statusFilter as Exclude<StatusFilter, "all">),
  });

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
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/feature-requests">
              <Button variant="ghost">&larr; Back</Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Admin: Feature Requests</h1>
              <p className="text-sm text-muted-foreground">
                Manage all feature requests
              </p>
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
        <div className="mb-6 flex items-center gap-4">
          <label className="text-sm font-medium">Filter by status:</label>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
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

        {featureRequests === undefined ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : featureRequests.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No feature requests found.</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Stories</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {featureRequests.map((request) => (
                  <TableRow key={request._id}>
                    <TableCell className="font-medium">
                      {request.title}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {request.authorEmail}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColor[request.status]}>
                        {request.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{request.userStories.length}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(request.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Link href={`/admin/feature-requests/${request._id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </div>
  );
}

export default function AdminFeatureRequestsPage() {
  return (
    <AuthGuard requireAdmin>
      <AdminFeatureRequestsContent />
    </AuthGuard>
  );
}
