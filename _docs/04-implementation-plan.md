# Implementation Plan & Agent Instructions
**Project Name:** Open Minds Fest Media Sorter
**Goal:** Build the application sequentially. **AGENTS: DO NOT skip steps. Complete each phase and verify functionality before moving to the next.**

## Phase 1: Foundation & Authentication (The Gates)
**Objective:** Set up the basic Next.js shell and ensure only approved users can get in.
1.  **Initialize Next.js:** Create a Next.js App Router project with Tailwind CSS and TypeScript.
2.  **Install Dependencies:** Add `next-auth`, `lucide-react` (for icons), and `shadcn-ui` (initialize and add Button, Card, Input components).
3.  **Set up NextAuth (Google):** * Create the `api/auth/[...nextauth]/route.ts`.
    * Configure the Google Provider.
4.  **Implement Manual Gatekeeping:**
    * Create a simple mechanism (e.g., a hardcoded array of approved emails in `.env` or a simple JSON file for now) to check if the logged-in Google email is "Approved".
    * If pending, show a "Waiting for Admin Approval" screen.
    * If approved, redirect to `/dashboard`.

## Phase 2: The Frontend Shell & UI (The Look)
**Objective:** Build the dark-mode UI layout and the navigation shell.
1.  **Global Styling:** Force dark mode in `tailwind.config.ts` and `globals.css`. Use neutral, elegant dark grays.
2.  **Dashboard Layout:** Create `/dashboard/layout.tsx` with a simple sidebar/topbar navigation (Upload, Gallery, Admin Review).
3.  **Masonry Component Skeleton:** Build a reusable `MasonryGrid` component in `/components` that accepts an array of image URLs and renders them in a tight, Pinterest-style layout.

## Phase 3: Direct-to-Drive Uploading (The Pipeline)
**Objective:** Allow users to securely push large files directly to Google Drive.
1.  **Drive Auth Setup:** Create a utility `lib/drive.ts` that authenticates with Google Drive using a Service Account JSON (credentials loaded from `.env`).
2.  **Upload URL Endpoint:** Create `/api/drive/get-upload-url`. This endpoint takes a filename and mime-type, authenticates with Drive, and returns a Resumable Upload URL pointing to the `Unsorted_Media` folder ID.
3.  **The Upload UI:** Build `/dashboard/upload/page.tsx`.
    * Implement a drag-and-drop zone.
    * On submit, loop through files: request the URL from the backend, then `PUT` the file directly to the Drive URL from the client browser.
    * Add a robust progress bar and ETA display.

## Phase 4: The Webhook & Queue (The Trigger)
**Objective:** Notify the system when an upload is completely finished.
1.  **Webhook Endpoint:** Create `/api/webhook/drive`. This will catch the POST request from Google Drive when a file lands in `Unsorted_Media`.
2.  **The Queue:** For MVP, when the webhook fires, simply append the new Google Drive File ID to a local `queue.json` file or log it securely so the local Python script knows it exists.

## Phase 5: The Local Python Brain (The Sorter)
**Objective:** The local script that does the heavy lifting. *(Agent: Write this as a standalone `sorter.py` script in the root, outside the Next.js `src`)*

1.  **Setup & Auth:** Python script that authenticates with the same Google Service Account.
2.  **Polling Loop:** Script runs `while True`, checking the queue every 10 seconds.
3.  **Detection Logic:**
    * Download the file temporarily.
    * Run `face_recognition`. Count faces.
    * If > 3: Use Drive API to copy to `Group_Photos`.
    * If 1-3: Compare to `.system/reference_faces/`. Copy to match or `Unknown_Faces`.
4.  **Rate Limiting:** Enforce `time.sleep(0.4)` between all Google Drive API calls to avoid 429 errors. Delete local temp file after copying.

## Phase 6: Admin Review & Distribution (The Output)
**Objective:** Allow the admin to tag unknowns and users to view/download galleries.
1.  **Admin Review UI:** Create `/dashboard/review/page.tsx`. Fetch images from the `Unknown_Faces` folder. Provide a UI input to type a student's name and submit.
2.  **Gallery UI:** Create `/dashboard/gallery/[student]/page.tsx`. Fetch thumbnails from the specific student's Drive folder and render them using the `MasonryGrid`.
3.  **Batch Download:** Add a button that fetches the current folder's contents, zips them in the browser using `jszip`, and triggers a download.