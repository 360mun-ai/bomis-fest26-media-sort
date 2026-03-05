import { UploadZone } from "@/components/upload-zone";

export default function UploadPage() {
    return (
        <div className="mx-auto max-w-4xl">
            <div className="mb-8">
                <h2 className="text-3xl font-bold tracking-tight text-zinc-100">Upload Media</h2>
                <p className="text-zinc-400">
                    Select high-resolution photos and videos to ingest into the Fest Media Sorter.
                    Files are pushed directly to Google Drive, bypassing Vercel limits.
                </p>
            </div>

            <UploadZone />
        </div>
    );
}
