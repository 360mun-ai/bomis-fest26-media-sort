import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDriveAuth, UNSORTED_FOLDER_ID } from "@/lib/drive";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const isApproved = (session?.user as { isApproved?: boolean })?.isApproved === true;

        if (!session || !isApproved) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { filename, mimeType } = await req.json();

        if (!filename || !mimeType) {
            return NextResponse.json({ error: "Missing filename or mimeType" }, { status: 400 });
        }

        if (!UNSORTED_FOLDER_ID) {
            return NextResponse.json({ error: "Drive folder ID not configured" }, { status: 500 });
        }

        // Get the JWT access token from our service account
        const auth = getDriveAuth();
        const { token } = await auth.getAccessToken();

        if (!token) {
            return NextResponse.json({ error: "Failed to authenticate with Google Drive" }, { status: 500 });
        }

        // Request a Resumable Upload Session URL from Google Drive
        // https://developers.google.com/drive/api/guides/manage-uploads#resumable
        const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL || "http://localhost:3000";
        const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                "X-Upload-Content-Type": mimeType,
                "Origin": origin,
            },
            body: JSON.stringify({
                name: filename,
                parents: [UNSORTED_FOLDER_ID],
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Google API Error:", errorText);
            return NextResponse.json({ error: "Failed to initiate upload session" }, { status: response.status });
        }

        const uploadUrl = response.headers.get("Location");

        if (!uploadUrl) {
            return NextResponse.json({ error: "Google did not return an upload URL" }, { status: 500 });
        }

        return NextResponse.json({ uploadUrl }, { status: 200 });

    } catch (error: unknown) {
        console.error("Error creating upload URL:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
