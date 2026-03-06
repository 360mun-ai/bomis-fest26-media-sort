import { google } from "googleapis";
import dotenv from "dotenv";
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

async function check() {
    try {
        console.log("Checking Google Drive API access...");
        const res = await drive.files.list({
            q: "name = '_bomis_approved_users.json' and trashed = false",
            fields: "files(id)",
            // Do not use spaces: "drive" when using service accounts directly, it may cause 403 Forbidden!
        });
        console.log("Found:", res.data.files);
    } catch (e) {
        console.error("Error:", e.message);
    }
}

check();
