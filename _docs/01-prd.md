# Product Requirements Document (PRD)
**Project Name:** Open Minds Fest Media Sorter
**Version:** 1.0

## 1. Purpose & Overview
The Open Minds Fest Media Sorter is a specialized, hybrid web application designed to handle the ingestion, processing, and organization of media (photos/videos) captured during school events. The system must support daily uploads of ~2,000 high-resolution files from various devices, bypassing cloud processing costs by utilizing a local Python engine for facial recognition, and leveraging a 2TB Google Drive quota for storage.

## 2. Target Audience & User Roles
* **Admin (Maxwell):** Full access. Can approve pending users, view all directories, manually tag unknown faces, and trigger batch downloads/sharing. Runs the local processing script.
* **Event Team:** Authenticated users who can upload media directly from mobile devices or laptops and view processed galleries. 
* **Pending Users:** Individuals who have signed in via Google OAuth but have not yet been granted manual approval by the Admin.

## 3. Core Features & Functional Requirements

### 3.1 Authentication & Authorization
* **Google OAuth:** All users log in using their Google accounts.
* **Manual Gatekeeping:** New logins default to a "Pending" state. The Admin must manually flip their status to "Approved" via a secure admin dashboard before they can access the upload portal or galleries.

### 3.2 Ingestion & Uploads
* **Direct-to-Drive:** To prevent Vercel server timeouts, the Next.js frontend must request a Google Drive Resumable Upload URL and push files directly from the user's browser/device to the Drive.
* **Upload Dashboard:** Must display a robust UI with real-time progress bars, successful upload counts, and estimated time of completion so the team knows when it is safe to close their browsers.

### 3.3 The Processing Engine (Local Queue)
* **Automated Trigger:** Uploads must trigger a Google Drive webhook to notify the backend, which updates a local/cloud queue.
* **Throttled Processing:** The local Python script must poll this queue and process images strictly at a rate that respects Google's API limit of 3 sustained writes per second.
* **Facial Recognition Logic (Copy, Do Not Move):**
    * **Group Photos:** Images with > 3 detected faces are identified and are copied to `/Fest_Media/Group_Photos/` as well as the respective individual each person in the image is copied to `/Fest_Media/Students/[Student_Name]/`.
    * **Targeted Portraits:** Images with 1-3 faces are run against the local reference database. Matches are copied to `/Fest_Media/Students/[Student_Name]/`.
    * **Cold Start / Unknowns:** Unrecognized faces are copied to `/Fest_Media/Unknown_Faces/`.

### 3.4 Admin Review & Gallery UI
* **Review Dashboard:** An interface for the Admin to view the `Unknown_Faces` directory, manually tag the student, and update the system's reference database for future matches.
* **Gallery Viewer:** A dark-mode UI featuring a masonry layout to elegantly display mixed-orientation photos. 
* **Performance:** The system must generate and serve compressed thumbnails (~50kb) for the web UI to ensure fast loading, only fetching the full 10MB+ file upon a download request.
* **Reidentify button:** The system must have a way to manually restart the facial recognition process for batches of unidentified or unknown faces image and then proccess them again to check for newly registered faces for identification.

## 4. Non-Functional Requirements
* **Cost:** Zero cloud processing costs; all heavy computation (face recognition) must occur on the local machine.
* **Stability:** The system must not crash under the load of 100+ simultaneous file uploads.
* **Cross-Platform:** The web UI must be fully responsive and optimized for both iOS/Android mobile browsers and desktop environments.