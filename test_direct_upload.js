// Isolated Google Drive Upload Test Script
const { google } = require("googleapis");
const fs = require("fs");
require("dotenv").config({ path: ".env.local" });

async function testDirectUpload() {
    console.log("=== Testing Direct Google Drive Upload ===\n");

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) {
        console.error("❌ GOOGLE_DRIVE_FOLDER_ID is missing from .env.local!");
        return;
    }

    console.log(`Target Folder ID: ${folderId}`);

    try {
        console.log("1. Initializing Google Auth...");
        const credentials = {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "",
            private_key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
        };

        const auth = new google.auth.JWT({
            email: credentials.client_email,
            key: credentials.private_key,
            scopes: ["https://www.googleapis.com/auth/drive"],
        });

        const drive = google.drive({ version: "v3", auth });

        console.log("✅ Auth initialized.");

        // Check if we can even access the folder
        console.log("\n2. Checking folder access...");
        try {
            const folderInfo = await drive.files.get({
                fileId: folderId,
                fields: "id, name, capabilities"
            });
            console.log(`✅ Folder accessed successfully: "${folderInfo.data.name}"`);
            console.log(`   Can Add Children:`, folderInfo.data.capabilities.canAddChildren);

            if (!folderInfo.data.capabilities.canAddChildren) {
                console.error("❌ CRITICAL ERROR: The Service Account does not have Editor permissions on this folder!");
                console.error("   Solution: Go to your personal Google Drive, share this folder with", credentials.client_email, "and set to 'Editor'.");
                return;
            }
        } catch (e) {
            console.error(`❌ FOLDER ACCESS FAILED: ${e.message}`);
            console.error("   This likely means the Service Account hasn't been shared with this folder.");
            return;
        }

        // Test uploading the dummy file
        console.log("\n3. Testing File Upload (test_video.mp4)...");
        if (!fs.existsSync("test_video.mp4")) {
            console.error("❌ test_video.mp4 not found. Did you create it?");
            return;
        }

        const fileSize = fs.statSync("test_video.mp4").size;
        console.log(`   Uploading ${fileSize} bytes...`);

        const res = await drive.files.create({
            requestBody: {
                name: "test_upload_from_script.mp4",
                parents: [folderId]
            },
            media: {
                mimeType: "video/mp4",
                body: fs.createReadStream("test_video.mp4")
            },
            fields: "id, name, webViewLink"
        });

        console.log("✅ UPLOAD SUCCESS!");
        console.log(`   File ID: ${res.data.id}`);
        console.log(`   File Name: ${res.data.name}`);
        console.log(`   Web View Link: ${res.data.webViewLink}`);

        // Clean up
        console.log("\n4. Cleaning up (deleting test file from Drive)...");
        await drive.files.delete({ fileId: res.data.id });
        console.log("✅ Cleanup complete.");

    } catch (e) {
        console.error("\n❌ FATAL UPLOAD ERROR CAUGHT:");
        console.error(e);
    }
}

testDirectUpload();
