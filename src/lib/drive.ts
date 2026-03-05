import { google } from "googleapis";

// Ensure variables exist but we won't crash at build time
const credentials = {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "",
    private_key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
};

export const driveAuth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/drive"],
});

export const drive = google.drive({ version: "v3", auth: driveAuth });

export const UNSORTED_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || "";
