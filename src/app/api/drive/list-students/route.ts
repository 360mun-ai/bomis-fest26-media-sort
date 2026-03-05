import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { drive } from "@/lib/drive";

// GET: List student folders (subfolders inside the Students root folder)
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        const isApproved = (session?.user as { isApproved?: boolean })?.isApproved === true;

        if (!session || !isApproved) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const studentsFolderId = process.env.GOOGLE_STUDENTS_FOLDER_ID;
        if (!studentsFolderId) {
            return NextResponse.json({ error: "Students folder ID not configured" }, { status: 500 });
        }

        const response = await drive.files.list({
            q: `'${studentsFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: "files(id, name)",
            pageSize: 200,
            orderBy: "name",
        });

        return NextResponse.json({ folders: response.data.files || [] }, { status: 200 });

    } catch (error: unknown) {
        console.error("Error listing student folders:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
