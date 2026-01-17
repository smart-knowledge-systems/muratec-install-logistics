import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Muratec Install Logistics</CardTitle>
          <CardDescription>
            AI-powered feature request and PRD management system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Describe features in natural language and let AI generate detailed
            PRDs and user stories for you.
          </p>
          <Link href="/feature-requests" className="block">
            <Button className="w-full">Get Started</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
