import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera } from "lucide-react";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
            <Camera className="h-6 w-6 text-zinc-200" />
          </div>
          <CardTitle className="text-2xl font-bold">Open Minds Fest Media</CardTitle>
          <CardDescription>Event Photography Ingestion Portal</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <form action="/api/auth/signin/google" method="POST">
            {/* Needs CSRF token but NextAuth auto handles this on their standard signin page. 
                For a custom button, it's better to use a client component or redirect to /api/auth/signin */}
            <Button className="w-full" size="lg" type="button" asChild>
              <Link href="/api/auth/signin/google">Sign In with Google</Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
