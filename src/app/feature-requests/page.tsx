"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { FeatureRequestForm } from "@/components/feature-request/feature-request-form";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import Link from "next/link";

function FeatureRequestsContent() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Feature Requests</h1>
            <p className="text-sm text-muted-foreground">
              Create and manage feature requests
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
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
      <main className="container mx-auto px-4 py-8">
        <FeatureRequestForm />
      </main>
    </div>
  );
}

export default function FeatureRequestsPage() {
  return (
    <AuthGuard>
      <FeatureRequestsContent />
    </AuthGuard>
  );
}
