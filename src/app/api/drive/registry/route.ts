import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

/**
 * Face Registry API
 * 
 * On Vercel: Reads from .system/face_registry.json if available (won't exist on serverless).
 * Returns empty array gracefully.
 * 
 * Locally: Reads the registry that the Python sorter maintains.
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
        // fs not available (Vercel Edge) or file doesn't exist
    }
    return {};
}

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        const isApproved = (session?.user as { isApproved?: boolean })?.isApproved === true;
        const isAdmin = process.env.ADMIN_EMAILS?.split(",").includes(session?.user?.email || "");

        if (!session || !isApproved || !isAdmin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const registry = loadRegistry();

        const entries = Object.entries(registry).map(([kidId, entry]) => ({
            kidId,
            ...entry,
        }));

        entries.sort((a, b) => {
            if (a.named !== b.named) return a.named ? 1 : -1;
            return a.display_name.localeCompare(b.display_name);
        });

        return NextResponse.json({ entries }, { status: 200 });

    } catch (error: unknown) {
        console.error("Error reading registry:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
