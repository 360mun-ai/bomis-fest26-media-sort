"use client";

import React, { useCallback, useState } from "react";
import { UploadCloud, FileImage, X, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export function UploadZone() {
    const [files, setFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
    const [uploadStatus, setUploadStatus] = useState<{ [key: string]: 'pending' | 'uploading' | 'success' | 'error' }>({});

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
    }, []);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const droppedFiles = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
            setFiles((prev) => [...prev, ...droppedFiles]);
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFiles = Array.from(e.target.files).filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
            setFiles((prev) => [...prev, ...selectedFiles]);
        }
    };

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const uploadFiles = async () => {
        if (files.length === 0) return;
        setIsUploading(true);

        const newStatus = { ...uploadStatus };
        const newProgress = { ...uploadProgress };

        files.forEach((file) => {
            newStatus[file.name] = 'pending';
            newProgress[file.name] = 0;
        });
        setUploadStatus(newStatus);
        setUploadProgress(newProgress);

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            try {
                setUploadStatus(prev => ({ ...prev, [file.name]: 'uploading' }));

                // 1. Get the resumable upload URL from our Next.js backend
                const resUrlRes = await fetch("/api/drive/get-upload-url", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ filename: file.name, mimeType: file.type }),
                });

                if (!resUrlRes.ok) throw new Error("Failed to get upload URL");
                const { uploadUrl } = await resUrlRes.json();

                // 2. Upload the file binary directly to Google Drive via XMLHttpRequest for progress events
                await new Promise<void>((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open("PUT", uploadUrl, true);

                    xhr.upload.onprogress = (e) => {
                        if (e.lengthComputable) {
                            const percentComplete = (e.loaded / e.total) * 100;
                            setUploadProgress(prev => ({ ...prev, [file.name]: percentComplete }));
                        }
                    };

                    xhr.onload = () => {
                        if (xhr.status === 200 || xhr.status === 201 || xhr.status === 308) { // 308 is used in resumable uploads
                            resolve();
                        } else {
                            reject(new Error(`Upload failed with status ${xhr.status}`));
                        }
                    };

                    xhr.onerror = () => reject(new Error("XHR Network Error"));

                    xhr.setRequestHeader("Content-Type", file.type);
                    xhr.send(file);
                });

                setUploadStatus(prev => ({ ...prev, [file.name]: 'success' }));
                setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));

            } catch (error) {
                console.error(`Error uploading ${file.name}:`, error);
                setUploadStatus(prev => ({ ...prev, [file.name]: 'error' }));
            }
        }

        setIsUploading(false);
    };

    const totalFiles = files.length;
    const successfulUploads = files.filter(f => uploadStatus[f.name] === 'success').length;
    const overallProgress = totalFiles > 0 ? (successfulUploads / totalFiles) * 100 : 0;

    return (
        <div className="space-y-6">
            {/* Upload Area */}
            <div
                className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/50 p-12 text-center transition-colors hover:border-zinc-500"
                onDragOver={onDragOver}
                onDrop={onDrop}
            >
                <div className="mb-4 rounded-full bg-zinc-800 p-4">
                    <UploadCloud className="h-8 w-8 text-zinc-400" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-zinc-100">Drag & Drop Media</h3>
                <p className="mb-6 text-sm text-zinc-400">
                    Upload large batches of high-resolution photos or videos. <br />
                    Files are pushed directly to Drive.
                </p>
                <label htmlFor="file-upload" className="cursor-pointer">
                    <Button variant="secondary" className="pointer-events-none text-zinc-100">Browse Files</Button>
                    <input
                        id="file-upload"
                        type="file"
                        multiple
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={handleFileSelect}
                        disabled={isUploading}
                    />
                </label>
            </div>

            {/* Selected Files List & Progress */}
            {files.length > 0 && (
                <Card className="border-zinc-800 bg-zinc-950">
                    <CardContent className="p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h4 className="font-medium text-zinc-100">Selected Files ({files.length})</h4>
                                {isUploading && (
                                    <p className="text-sm text-zinc-400">Uploading {successfulUploads} of {totalFiles}...</p>
                                )}
                            </div>
                            <Button onClick={uploadFiles} disabled={isUploading || isUploading && successfulUploads === totalFiles}>
                                {isUploading ? "Uploading..." : "Start Upload"}
                            </Button>
                        </div>

                        {isUploading && (
                            <Progress value={overallProgress} className="mb-6 h-2 w-full bg-zinc-800 [&>div]:bg-zinc-100" />
                        )}

                        <div className="max-h-64 space-y-2 overflow-y-auto pr-2">
                            {files.map((file, index) => (
                                <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900 p-3">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <FileImage className="h-5 w-5 shrink-0 text-zinc-500" />
                                        <div className="truncate">
                                            <p className="truncate text-sm font-medium text-zinc-200">{file.name}</p>
                                            <p className="text-xs text-zinc-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 shrink-0 px-2">
                                        {uploadStatus[file.name] === 'uploading' && (
                                            <span className="text-xs text-zinc-400">{Math.round(uploadProgress[file.name] || 0)}%</span>
                                        )}
                                        {uploadStatus[file.name] === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                                        {uploadStatus[file.name] === 'error' && <span className="text-xs text-red-500">Failed</span>}
                                        {!isUploading && uploadStatus[file.name] !== 'success' && (
                                            <button onClick={() => removeFile(index)} className="rounded-md p-1 hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors">
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
