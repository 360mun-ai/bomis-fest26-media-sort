import { google } from "googleapis";

/**
 * Returns a Google Drive API client authenticated via OAuth2 using the
 * admin account's refresh token. This bypasses the Service Account
 * 0-byte storage quota limitation.
 */
export function getDriveAuth() {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
    );
    oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });
    return oauth2Client;
}

export function getDriveClient() {
    return google.drive({ version: "v3", auth: getDriveAuth() });
}

export const UNSORTED_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || "";
