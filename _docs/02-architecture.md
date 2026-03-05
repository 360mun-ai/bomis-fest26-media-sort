# Architecture & App Flow
**Project Name:** Open Minds Fest Media Sorter

## 1. Technology Stack
* **Frontend / Web Backend:** Next.js (App Router), deployed on Vercel (Free Tier).
* **Styling & UI:** Tailwind CSS, shadcn/ui components (Dark mode default).
* **Authentication:** NextAuth.js (Auth.js) with Google Provider.
* **Primary Storage & Database:** Google Drive API (utilizing existing 2TB quota).
* **Local AI Engine:** Python utilizing `face_recognition` (dlib/OpenCV wrapper) and Google API Service Account credentials.

## 2. System Diagram Concept


The architecture relies on a strict separation of concerns: the Vercel-hosted Next.js app handles all user interaction and lightweight API routing, while the local machine handles all heavy computational lifting.

## 3. Data Flow & Execution Phases

### Phase 1: Client-Side Upload (Bypassing Vercel)
1.  User selects 100 DSLR photos on the Next.js frontend.
2.  Next.js backend securely authenticates with Google Drive using a Service Account and generates 100 unique Resumable Upload URLs.
3.  The frontend pushes the binary data of each photo directly to these URLs, landing them in `Drive/Fest_Media/Unsorted_Media`. Vercel's 4.5MB payload limit is completely bypassed.

### Phase 2: The Webhook Handshake
1.  Upon successful upload, Google Drive fires a push notification (POST request) to the Next.js webhook endpoint `/api/drive-webhook`.
2.  Next.js logs the new file ID into a lightweight queue system (can be a simple Vercel KV store or a shared Google Sheet).

### Phase 3: The Local Python Worker
1.  The local Python script runs a continuous `while True` loop, checking the queue every few seconds.
2.  When new files are detected, it initiates a download of the batch to the local machine's temporary RAM/storage.
3.  **The Pipeline:**
    * *Detect:* Locates bounding boxes for all faces.
    * *Count:* If faces > 3, issue Google Drive API command to copy file to `Group_Photos`.
    * *Recognize:* If faces <= 3, compute facial encodings and compare against the local `.system/reference_faces/` database.
    * *Route:* Issue Google Drive API command to copy to `Students/[Name]` or `Unknown_Faces`.
4.  **Rate Limiting:** Every API call back to Google Drive is intentionally delayed by `time.sleep(0.35)` to ensure the script stays under the 3 requests/second quota.
5.  **Cleanup:** The local temporary file is deleted, and the queue item is marked as "Processed."

### Phase 4: Serving the UI
1.  When a user navigates to `/dashboard/gallery/[Student_Name]`, Next.js requests the folder contents from Google Drive.
2.  Next.js renders the UI using the pre-generated thumbnails.
3.  Admin tagging in the `/dashboard/review` route sends a command back to the Python script to update the reference encodings database.