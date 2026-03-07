import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDriveClient } from "@/lib/drive";

// GET: List files in a specific Google Drive folder
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const isApproved = (session?.user as { isApproved?: boolean })?.isApproved === true;

        if (!session || !isApproved) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const folderId = searchParams.get("folderId");

        if (!folderId) {
            return NextResponse.json({ error: "Missing folderId parameter" }, { status: 400 });
        }

        const drive = getDriveClient();
        const response = await drive.files.list({
            q: `'${folderId}' in parents and trashed = false`,
            fields: "files(id, name, mimeType, thumbnailLink, webContentLink, createdTime)",
            pageSize: 100,
            orderBy: "createdTime desc",
        });

        return NextResponse.json({ files: response.data.files || [] }, { status: 200 });

    } catch (error: unknown) {
        console.error("Error listing Drive files:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
