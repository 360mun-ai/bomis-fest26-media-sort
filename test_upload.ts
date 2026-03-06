import { google } from "googleapis";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({ path: ".env.local" });

const credentials = {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "",
    private_key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
};

const driveAuth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({ version: "v3", auth: driveAuth });

const UNSORTED_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || "";

async function testUpload() {
    try {
        console.log("Testing upload to Unsorted_Media ID:", UNSORTED_FOLDER_ID);

        // Create a fake txt file in memory
        const response = await drive.files.create({
            requestBody: {
                name: "test_upload.txt",
                parents: [UNSORTED_FOLDER_ID],
            },
            media: {
                mimeType: "text/plain",
                body: "This is a test file from the Media Sorter Bot verifying permissions.",
            },
            fields: "id",
        });

        console.log("SUCCESS! Uploaded test file ID:", response.data.id);

        // Delete the test file right after
        if (response.data.id) {
            await drive.files.delete({ fileId: response.data.id });
            console.log("Cleaned up test file.");
        }

    } catch (e) {
        console.error("FAIL! Could not upload:", e.message);
    }
}

testUpload();
