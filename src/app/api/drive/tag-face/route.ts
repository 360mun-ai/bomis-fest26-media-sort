import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDriveClient } from "@/lib/drive";

// POST: Tag an unknown face by moving the file to a student's folder
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const isApproved = (session?.user as { isApproved?: boolean })?.isApproved === true;
        const isAdmin = process.env.ADMIN_EMAILS?.split(",").includes(session?.user?.email || "");

        if (!session || !isApproved || !isAdmin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { fileId, studentName } = await req.json();

        if (!fileId || !studentName) {
            return NextResponse.json({ error: "Missing fileId or studentName" }, { status: 400 });
        }

        const studentsFolderId = process.env.GOOGLE_STUDENTS_FOLDER_ID;
        if (!studentsFolderId) {
            return NextResponse.json({ error: "Students folder ID not configured" }, { status: 500 });
        }

        // Check if a folder for this student already exists
        const drive = getDriveClient();
        const existingFolders = await drive.files.list({
            q: `'${studentsFolderId}' in parents and name = '${studentName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: "files(id, name)",
        });

        let targetFolderId: string;

        if (existingFolders.data.files && existingFolders.data.files.length > 0) {
            targetFolderId = existingFolders.data.files[0].id!;
        } else {
            // Create the student folder
            const newFolder = await drive.files.create({
                requestBody: {
                    name: studentName,
                    mimeType: "application/vnd.google-apps.folder",
                    parents: [studentsFolderId],
                },
                fields: "id",
            });
            targetFolderId = newFolder.data.id!;
        }

        // Copy the file to the student's folder
        await drive.files.copy({
            fileId: fileId,
            requestBody: {
                parents: [targetFolderId],
            },
        });

        // Optionally: Remove the file from Unknown_Faces after tagging
        // await drive.files.delete({ fileId: fileId });

        return NextResponse.json({ status: "tagged", studentName, targetFolderId }, { status: 200 });

    } catch (error: unknown) {
        console.error("Error tagging face:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
