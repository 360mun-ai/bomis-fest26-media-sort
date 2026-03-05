"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, FolderOpen, Users } from "lucide-react";

interface StudentFolder {
    id: string;
    name: string;
}

export default function GalleryIndexPage() {
    const [folders, setFolders] = useState<StudentFolder[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStudents() {
            try {
                const res = await fetch("/api/drive/list-students");
                if (res.ok) {
                    const data = await res.json();
                    setFolders(data.folders);
                }
            } catch (err) {
                console.error("Failed to fetch student folders:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchStudents();
    }, []);

    return (
        <div className="mx-auto max-w-6xl">
            <div className="mb-8">
                <h2 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-zinc-100">
                    <Users className="h-7 w-7" />
                    Student Galleries
                </h2>
                <p className="text-zinc-400">Browse sorted media by student name.</p>
            </div>

            {loading && (
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
                </div>
            )}

            {!loading && folders.length === 0 && (
                <Card className="border-zinc-800 bg-zinc-900/50">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <FolderOpen className="mb-4 h-12 w-12 text-zinc-600" />
                        <p className="text-lg font-medium text-zinc-400">No student galleries yet</p>
                        <p className="text-sm text-zinc-500">Galleries will appear here once the sorter has processed uploaded media.</p>
                    </CardContent>
                </Card>
            )}

            {!loading && folders.length > 0 && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {folders.map((folder) => (
                        <Link key={folder.id} href={`/dashboard/gallery/${encodeURIComponent(folder.name)}?folderId=${folder.id}`}>
                            <Card className="group cursor-pointer border-zinc-800 bg-zinc-900 transition-all hover:border-zinc-600 hover:bg-zinc-800/80">
                                <CardContent className="flex flex-col items-center justify-center py-8">
                                    <div className="mb-3 rounded-full bg-zinc-800 p-3 transition-colors group-hover:bg-zinc-700">
                                        <FolderOpen className="h-6 w-6 text-zinc-400 group-hover:text-zinc-200" />
                                    </div>
                                    <p className="text-center text-sm font-medium text-zinc-200 group-hover:text-zinc-50">{folder.name}</p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
