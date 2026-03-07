const fs = require("fs");

async function testUpload() {
    console.log("Starting test upload to live Vercel endpoint...");

    // 1. We need to simulate an authenticated NextAuth session cookies to call the API
    // We'll run this against localhost first to see if it even works locally without CORS
    const apiUrl = "http://localhost:3000/api/drive/get-upload-url";

    // Test the first file
    const filename = "test_image.jpg";
    const mimeType = "image/jpeg";

    try {
        console.log(`Requesting upload URL for ${filename} (${mimeType})...`);
        const res = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ filename, mimeType })
        });

        const data = await res.json();

        if (!res.ok) {
            console.error(`❌ get-upload-url failed (${res.status}):`, data);
            return;
        }

        console.log("✅ Got upload URL:", data.uploadUrl.substring(0, 50) + "...");

        // 2. Perform the actual PUT request to Google Drive
        console.log("Uploading file buffer to Google Drive...");
        const buffer = fs.readFileSync(filename);

        const uploadRes = await fetch(data.uploadUrl, {
            method: "PUT",
            headers: {
                "Content-Type": mimeType,
                "Content-Length": buffer.length.toString()
            },
            body: buffer
        });

        if (!uploadRes.ok) {
            const errorText = await uploadRes.text();
            console.error(`❌ Google Drive PUT failed (${uploadRes.status}):`, errorText);
            return;
        }

        console.log("✅ File uploaded successfully!");
    } catch (e) {
        console.error("❌ Exception during upload test:", e.message);
    }
}

testUpload();
