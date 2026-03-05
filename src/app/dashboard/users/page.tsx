"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    ShieldAlert,
    Loader2,
    RefreshCw,
    UserCircle,
    Check,
    X,
    UserPlus,
    Users,
} from "lucide-react";

interface UserEntry {
    email: string;
    name: string;
    image?: string;
    approved: boolean;
    requestedAt: string;
    approvedAt?: string;
}

export default function UserApprovalsPage() {
    const [users, setUsers] = useState<UserEntry[]>([]);
    const [adminEmails, setAdminEmails] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/users");
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users);
                setAdminEmails(data.adminEmails || []);
            }
        } catch (err) {
            console.error("Failed to fetch users:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleAction = async (email: string, action: "approve" | "revoke") => {
        setActionLoading(email);
        try {
            const res = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, action }),
            });
            if (res.ok) {
                setUsers((prev) =>
                    prev.map((u) =>
                        u.email === email
                            ? { ...u, approved: action === "approve", approvedAt: action === "approve" ? new Date().toISOString() : undefined }
                            : u
                    )
                );
            }
        } catch (err) {
            console.error("Failed to update user:", err);
        } finally {
            setActionLoading(null);
        }
    };

    const pendingUsers = users.filter((u) => !u.approved && !adminEmails.includes(u.email));
    const approvedUsers = users.filter((u) => u.approved || adminEmails.includes(u.email));

    return (
        <div className="mx-auto max-w-4xl">
            {/* Header */}
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-zinc-100">
                        <ShieldAlert className="h-7 w-7" />
                        User Approvals
                    </h2>
                    <p className="mt-1 text-zinc-400">
                        Manage who can access the upload portal and galleries.
                    </p>
                </div>
                <Button
                    variant="outline"
                    onClick={fetchUsers}
                    disabled={loading}
                    className="shrink-0 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
            </div>

            {/* Stats */}
            {!loading && (
                <div className="mb-6 flex gap-4">
                    <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2">
                        <Users className="h-4 w-4 text-zinc-500" />
                        <span className="text-sm text-zinc-400">{users.length} total</span>
                    </div>
                    {pendingUsers.length > 0 && (
                        <div className="flex items-center gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-2">
                            <span className="h-2 w-2 rounded-full bg-yellow-500" />
                            <span className="text-sm text-yellow-400">{pendingUsers.length} pending</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2">
                        <Check className="h-3 w-3 text-emerald-500" />
                        <span className="text-sm text-emerald-400">{approvedUsers.length} approved</span>
                    </div>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
                </div>
            )}

            {/* Empty State */}
            {!loading && users.length === 0 && (
                <Card className="border-zinc-800 bg-zinc-900/50">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <UserPlus className="mb-4 h-12 w-12 text-zinc-600" />
                        <p className="text-lg font-medium text-zinc-400">No users yet</p>
                        <p className="text-sm text-zinc-500">
                            Users will appear here after they sign in with Google for the first time.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Pending Users Section */}
            {!loading && pendingUsers.length > 0 && (
                <div className="mb-8">
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-yellow-400">
                        <span className="h-2 w-2 rounded-full bg-yellow-500" />
                        Pending Approval ({pendingUsers.length})
                    </h3>
                    <div className="space-y-3">
                        {pendingUsers.map((user) => (
                            <Card key={user.email} className="border-yellow-500/20 bg-zinc-900">
                                <CardContent className="flex items-center justify-between p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 overflow-hidden">
                                            {user.image ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={user.image} alt={user.name} className="h-full w-full object-cover" />
                                            ) : (
                                                <UserCircle className="h-6 w-6 text-zinc-500" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium text-zinc-100">{user.name}</p>
                                            <p className="text-sm text-zinc-500">{user.email}</p>
                                        </div>
                                        <Badge className="ml-2 border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/10">
                                            Pending
                                        </Badge>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            onClick={() => handleAction(user.email, "approve")}
                                            disabled={actionLoading === user.email}
                                            className="bg-emerald-600 hover:bg-emerald-700"
                                        >
                                            {actionLoading === user.email ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <Check className="mr-1 h-3 w-3" /> Approve
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Approved Users Section */}
            {!loading && approvedUsers.length > 0 && (
                <div>
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-emerald-400">
                        <Check className="h-4 w-4" />
                        Approved ({approvedUsers.length})
                    </h3>
                    <div className="space-y-3">
                        {approvedUsers.map((user) => {
                            const isAdmin = adminEmails.includes(user.email);
                            return (
                                <Card key={user.email} className="border-zinc-800 bg-zinc-900">
                                    <CardContent className="flex items-center justify-between p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 overflow-hidden">
                                                {user.image ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={user.image} alt={user.name} className="h-full w-full object-cover" />
                                                ) : (
                                                    <UserCircle className="h-6 w-6 text-zinc-500" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium text-zinc-100">{user.name}</p>
                                                <p className="text-sm text-zinc-500">{user.email}</p>
                                            </div>
                                            {isAdmin ? (
                                                <Badge className="ml-2 border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/10">
                                                    Admin
                                                </Badge>
                                            ) : (
                                                <Badge className="ml-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/10">
                                                    Approved
                                                </Badge>
                                            )}
                                        </div>
                                        {!isAdmin && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleAction(user.email, "revoke")}
                                                disabled={actionLoading === user.email}
                                                className="border-zinc-700 text-zinc-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
                                            >
                                                {actionLoading === user.email ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <X className="mr-1 h-3 w-3" /> Revoke
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
