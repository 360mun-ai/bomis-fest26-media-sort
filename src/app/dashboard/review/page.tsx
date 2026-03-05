"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    ShieldCheck,
    Loader2,
    RefreshCw,
    UserCircle,
    Check,
    Pencil,
    X,
    ImageIcon,
    FolderOpen,
} from "lucide-react";

interface RegistryEntry {
    kidId: string;
    drive_folder_id: string;
    named: boolean;
    display_name: string;
    photo_count: number;
}

export default function ReviewPage() {
    const [entries, setEntries] = useState<RegistryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newName, setNewName] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const fetchRegistry = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/drive/registry");
            if (res.ok) {
                const data = await res.json();
                setEntries(data.entries);
            }
        } catch (err) {
            console.error("Failed to fetch registry:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRegistry();
    }, [fetchRegistry]);

    const handleRename = async (kidId: string) => {
        if (!newName.trim()) return;
        setSubmitting(true);
        try {
            const res = await fetch("/api/drive/rename-student", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ kidId, newName: newName.trim() }),
            });
            if (res.ok) {
                setEntries((prev) =>
                    prev.map((e) =>
                        e.kidId === kidId
                            ? { ...e, display_name: newName.trim(), named: true }
                            : e
                    )
                );
                setEditingId(null);
                setNewName("");
            }
        } catch (err) {
            console.error("Failed to rename:", err);
        } finally {
            setSubmitting(false);
        }
    };

    const pendingCount = entries.filter((e) => !e.named).length;
    const namedCount = entries.filter((e) => e.named).length;

    return (
        <div className="mx-auto max-w-6xl">
            {/* Header */}
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-zinc-100">
                        <ShieldCheck className="h-7 w-7" />
                        Face Management
                    </h2>
                    <p className="mt-1 text-zinc-400">
                        Review auto-detected faces and assign real names to each student.
                    </p>
                </div>
                <Button
                    variant="outline"
                    onClick={fetchRegistry}
                    disabled={loading}
                    className="shrink-0 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
            </div>

            {/* Stats Bar */}
            {!loading && entries.length > 0 && (
                <div className="mb-6 flex gap-4">
                    <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2">
                        <UserCircle className="h-4 w-4 text-zinc-500" />
                        <span className="text-sm text-zinc-400">{entries.length} total</span>
                    </div>
                    {pendingCount > 0 && (
                        <div className="flex items-center gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-2">
                            <span className="h-2 w-2 rounded-full bg-yellow-500" />
                            <span className="text-sm text-yellow-400">{pendingCount} pending</span>
                        </div>
                    )}
                    {namedCount > 0 && (
                        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2">
                            <Check className="h-3 w-3 text-emerald-500" />
                            <span className="text-sm text-emerald-400">{namedCount} named</span>
                        </div>
                    )}
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
                </div>
            )}

            {/* Empty State */}
            {!loading && entries.length === 0 && (
                <Card className="border-zinc-800 bg-zinc-900/50">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <UserCircle className="mb-4 h-12 w-12 text-zinc-600" />
                        <p className="text-lg font-medium text-zinc-400">No faces detected yet</p>
                        <p className="text-sm text-zinc-500">
                            Run the sorter script on uploaded media. Auto-detected faces will appear here.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Face Grid */}
            {!loading && entries.length > 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {entries.map((entry) => (
                        <Card
                            key={entry.kidId}
                            className={`overflow-hidden border transition-colors ${entry.named
                                    ? "border-zinc-800 bg-zinc-900"
                                    : "border-yellow-500/20 bg-zinc-900"
                                }`}
                        >
                            {/* Face Thumbnail */}
                            <div className="relative aspect-square overflow-hidden bg-zinc-800">
                                {/* Reference thumbnail lives in .system/reference_faces/kid_N.jpg
                    In production, serve this via a Next.js API route or use the Drive thumbnail.
                    For now, show a styled placeholder with the kid ID. */}
                                <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                                    <UserCircle className="h-16 w-16 text-zinc-600" />
                                    <span className="mt-2 font-mono text-xs text-zinc-500">{entry.kidId}</span>
                                </div>

                                {/* Status badge */}
                                <div className="absolute right-2 top-2">
                                    {entry.named ? (
                                        <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/10">
                                            <Check className="mr-1 h-3 w-3" /> Named
                                        </Badge>
                                    ) : (
                                        <Badge className="border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/10">
                                            Pending
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {/* Info + Actions */}
                            <CardContent className="p-4">
                                {/* Display name */}
                                <div className="mb-3">
                                    <p className="text-base font-semibold text-zinc-100">{entry.display_name}</p>
                                    <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                                        <span className="flex items-center gap-1">
                                            <ImageIcon className="h-3 w-3" />
                                            {entry.photo_count} photo{entry.photo_count !== 1 ? "s" : ""}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <FolderOpen className="h-3 w-3" />
                                            {entry.kidId}
                                        </span>
                                    </div>
                                </div>

                                {/* Rename mode */}
                                {editingId === entry.kidId ? (
                                    <div className="space-y-2">
                                        <Input
                                            placeholder="Enter real name..."
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && newName.trim()) handleRename(entry.kidId);
                                                if (e.key === "Escape") { setEditingId(null); setNewName(""); }
                                            }}
                                            className="border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500"
                                            autoFocus
                                        />
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                onClick={() => handleRename(entry.kidId)}
                                                disabled={submitting || !newName.trim()}
                                                className="flex-1"
                                            >
                                                {submitting ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Check className="mr-1 h-3 w-3" /> Save
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => { setEditingId(null); setNewName(""); }}
                                                className="border-zinc-700 text-zinc-400"
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <Button
                                        size="sm"
                                        variant={entry.named ? "outline" : "default"}
                                        onClick={() => {
                                            setEditingId(entry.kidId);
                                            setNewName(entry.named ? entry.display_name : "");
                                        }}
                                        className={`w-full ${entry.named
                                                ? "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                                : ""
                                            }`}
                                    >
                                        <Pencil className="mr-2 h-3 w-3" />
                                        {entry.named ? "Rename" : "Assign Name"}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
