"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MasonryGrid } from "@/components/masonry-grid";
import { Loader2, Download, ArrowLeft, ImageOff } from "lucide-react";
import Link from "next/link";
import JSZip from "jszip";
import { saveAs } from "file-saver";

interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    thumbnailLink?: string;
    webContentLink?: string;
}

export default function StudentGalleryPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const studentName = decodeURIComponent(params.student as string);
    const folderId = searchParams.get("folderId") || "";

    const [files, setFiles] = useState<DriveFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);

    const fetchFiles = useCallback(async () => {
        if (!folderId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`/api/drive/list-files?folderId=${folderId}`);
            if (res.ok) {
                const data = await res.json();
                setFiles(data.files);
            }
        } catch (err) {
            console.error("Failed to fetch gallery files:", err);
        } finally {
            setLoading(false);
        }
    }, [folderId]);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    const handleBatchDownload = async () => {
        if (files.length === 0) return;
        setDownloading(true);
        try {
            const zip = new JSZip();
            const folder = zip.folder(studentName);

            for (const file of files) {
                if (file.webContentLink) {
                    try {
                        const response = await fetch(file.webContentLink);
                        const blob = await response.blob();
                        folder?.file(file.name, blob);
                    } catch (err) {
                        console.error(`Failed to download ${file.name}:`, err);
                    }
                }
            }

            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, `${studentName}_photos.zip`);
        } catch (err) {
            console.error("Failed to create zip:", err);
        } finally {
            setDownloading(false);
        }
    };

    const thumbnailUrls = files
        .filter((f) => f.thumbnailLink)
        .map((f) => f.thumbnailLink!.replace("=s220", "=s600"));

    return (
        <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/gallery">
                        <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-zinc-50">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-zinc-100">{studentName}</h2>
                        <p className="text-zinc-400">{files.length} photo{files.length !== 1 ? "s" : ""}</p>
                    </div>
                </div>
                {files.length > 0 && (
                    <Button onClick={handleBatchDownload} disabled={downloading} className="shrink-0">
                        {downloading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Download className="mr-2 h-4 w-4" />
                        )}
                        {downloading ? "Zipping..." : "Download All"}
                    </Button>
                )}
            </div>

            {loading && (
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
                </div>
            )}

            {!loading && files.length === 0 && (
                <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-zinc-800 bg-zinc-900/50">
                    <ImageOff className="mb-4 h-12 w-12 text-zinc-600" />
                    <p className="text-lg font-medium text-zinc-400">No photos yet</p>
                </div>
            )}

            {!loading && files.length > 0 && <MasonryGrid images={thumbnailUrls} />}
        </div>
    );
}
