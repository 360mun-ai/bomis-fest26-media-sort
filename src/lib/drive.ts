import { google } from "googleapis";

export function getDriveAuth() {
    const credentials = {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "",
        private_key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    };

    return new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ["https://www.googleapis.com/auth/drive"],
    });
}

export function getDriveClient() {
    return google.drive({ version: "v3", auth: getDriveAuth() });
}

export const UNSORTED_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || "";
