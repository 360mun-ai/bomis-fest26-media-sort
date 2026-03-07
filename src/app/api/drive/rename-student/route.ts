import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDriveClient } from "@/lib/drive";

/**
 * Rename Student API
 * 
 * Renames a kid_N entry to a real student name:
 * 1. Renames the Google Drive folder (works on Vercel — uses Drive API, not local fs)
 * 2. Updates local face_registry.json (only works when running locally)
 * 3. Renames local reference face file (only works when running locally)
 */

interface RegistryEntry {
    drive_folder_id: string;
    named: boolean;
    display_name: string;
    photo_count: number;
}

function loadRegistry(): Record<string, RegistryEntry> {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require("fs");
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const path = require("path");
        const registryPath = path.join(process.cwd(), ".system", "face_registry.json");
        if (fs.existsSync(registryPath)) {
            return JSON.parse(fs.readFileSync(registryPath, "utf-8"));
        }
    } catch {
        // fs not available
    }
    return {};
}

function saveRegistry(registry: Record<string, RegistryEntry>) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require("fs");
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const path = require("path");
        const registryPath = path.join(process.cwd(), ".system", "face_registry.json");
        fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
    } catch {
        // fs not available on Vercel — Drive folder was still renamed via API
    }
}

function renameLocalReference(kidId: string, newName: string) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require("fs");
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const path = require("path");
        const refDir = path.join(process.cwd(), ".system", "reference_faces");
        const oldPath = path.join(refDir, `${kidId}.jpg`);
        const newPath = path.join(refDir, `${newName}.jpg`);
        if (fs.existsSync(oldPath)) {
            fs.renameSync(oldPath, newPath);
        }
    } catch {
        // fs not available
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const isApproved = (session?.user as { isApproved?: boolean })?.isApproved === true;
        const isAdmin = process.env.ADMIN_EMAILS?.split(",").includes(session?.user?.email || "");

        if (!session || !isApproved || !isAdmin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { kidId, newName } = await req.json();

        if (!kidId || !newName || !newName.trim()) {
            return NextResponse.json({ error: "Missing kidId or newName" }, { status: 400 });
        }

        const cleanName = newName.trim();
        const registry = loadRegistry();
        const entry = registry[kidId];

        if (!entry) {
            return NextResponse.json({ error: `Kid ${kidId} not found in registry` }, { status: 404 });
        }

        // 1. Rename the Google Drive folder (always works — uses Drive API)
        const drive = getDriveClient();
        await drive.files.update({
            fileId: entry.drive_folder_id,
            requestBody: { name: cleanName },
        });

        // 2. Rename local reference face file (local only)
        renameLocalReference(kidId, cleanName);

        // 3. Update the registry (local only)
        registry[kidId] = {
            ...entry,
            display_name: cleanName,
            named: true,
        };
        saveRegistry(registry);

        return NextResponse.json({
            status: "renamed",
            kidId,
            newName: cleanName,
            folderId: entry.drive_folder_id,
        }, { status: 200 });

    } catch (error: unknown) {
        console.error("Error renaming student:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
