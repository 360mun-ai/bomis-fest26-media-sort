import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, UploadCloud, Image as ImageIcon, ShieldCheck, LogOut, Camera } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/");
    }

    const isApproved = (session.user as { isApproved?: boolean })?.isApproved === true;
    const isAdmin = process.env.ADMIN_EMAILS?.split(",").includes(session.user?.email || "");

    if (!isApproved) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center p-4">
                <Card className="w-full max-w-md border-zinc-800 bg-zinc-900/50">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/10">
                            <ShieldAlert className="h-6 w-6 text-yellow-500" />
                        </div>
                        <CardTitle className="text-xl font-semibold text-zinc-100">Access Pending</CardTitle>
                        <CardDescription className="text-zinc-400">
                            Your account ({session.user?.email}) is waiting for administrator approval.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-center text-zinc-500 mb-6">
                            Please contact the event administrator to grant you access to the upload portal and galleries.
                        </p>
                        <form action="/api/auth/signout" method="POST">
                            <Button variant="outline" className="w-full text-zinc-300 border-zinc-700 hover:bg-zinc-800" type="submit">
                                Sign Out
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </main>
        );
    }

    return (
        <div className="flex min-h-screen bg-zinc-950 text-zinc-50">
            {/* Sidebar Navigation */}
            <aside className="hidden w-64 flex-col border-r border-zinc-800 bg-zinc-950 md:flex">
                <div className="flex h-14 items-center border-b border-zinc-800 px-6 shrink-0">
                    <Camera className="mr-2 h-5 w-5 text-zinc-300" />
                    <span className="font-semibold text-zinc-100">OM Fest Media</span>
                </div>
                <nav className="flex-1 space-y-1 p-4">
                    <Link href="/dashboard/upload" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50 transition-colors">
                        <UploadCloud className="h-5 w-5" />
                        Upload Media
                    </Link>
                    <Link href="/dashboard/gallery" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50 transition-colors">
                        <ImageIcon className="h-5 w-5" />
                        Galleries
                    </Link>
                    {isAdmin && (
                        <Link href="/dashboard/review" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50 transition-colors mt-6">
                            <ShieldCheck className="h-5 w-5" />
                            Admin Review
                        </Link>
                    )}
                </nav>
                <div className="border-t border-zinc-800 p-4">
                    <div className="flex items-center gap-3 mb-4 px-3">
                        <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden">
                            {session.user?.image ? (
                                <img src={session.user.image} alt="Avatar" className="h-full w-full object-cover" />
                            ) : (
                                <span className="text-xs text-zinc-400">{session.user?.name?.charAt(0)}</span>
                            )}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="truncate text-sm font-medium text-zinc-200">{session.user?.name}</p>
                            <p className="truncate text-xs text-zinc-500">{session.user?.email}</p>
                        </div>
                    </div>
                    <form action="/api/auth/signout" method="POST">
                        <Button variant="ghost" className="w-full justify-start text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50" type="submit">
                            <LogOut className="mr-2 h-4 w-4" />
                            Sign out
                        </Button>
                    </form>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Mobile Topbar */}
                <header className="flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 md:hidden shrink-0">
                    <div className="flex items-center text-sm font-semibold text-zinc-100">
                        <Camera className="mr-2 h-5 w-5" />
                        OM Fest
                    </div>
                    {/* Mobile menu could be added here, but keeping it simple as per PRD */}
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto bg-zinc-950 p-4 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
