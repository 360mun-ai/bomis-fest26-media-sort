# Directory Structure & Data Map

This document outlines both the local Next.js codebase structure and the remote Google Drive folder architecture required for the Open Minds Fest Media Sorter.

## 1. Local Codebase Structure (Next.js Web App)
The web application will follow the standard Next.js App Router conventions.

open-minds-media-sorter/
├── _docs/                  # Project documentation and agent instructions
├── src/
│   ├── app/                # Next.js App Router pages
│   │   ├── (auth)/         # Grouped auth routes (login)
│   │   ├── dashboard/      # Main admin/team UI
│   │   │   ├── upload/     # File selection and direct-to-drive UI
│   │   │   ├── gallery/    # Viewing sorted student directories
│   │   │   └── review/     # Admin UI for tagging unknown faces
│   │   ├── api/            # Backend endpoints
│   │   │   ├── auth/       # NextAuth endpoints
│   │   │   ├── drive/      # Fetching direct upload URLs from Google
│   │   │   └── webhook/    # Receiving Google Drive push notifications
│   │   ├── layout.tsx      # Global layout (Dark mode wrapper)
│   │   └── page.tsx        # Landing/Login page
│   ├── components/         # Reusable React components (shadcn/ui)
│   │   ├── ui/             # Base UI elements (buttons, inputs)
│   │   ├── masonry-grid.tsx# Gallery layout component
│   │   └── upload-zone.tsx # Drag-and-drop upload component
│   ├── lib/                # Utility functions and configs
│   │   ├── auth.ts         # NextAuth configuration
│   │   └── drive.ts        # Google Drive API helper functions
│   └── types/              # TypeScript interfaces
├── .env.local              # Environment variables (OAuth keys, Service Account)
├── next.config.mjs         # Next.js configuration
├── tailwind.config.ts      # Tailwind CSS configuration
└── package.json            # Dependencies

## 2. Remote Google Drive Structure
The storage layer acts as the primary database for media. The local Python script and the Next.js app must interact with this specific structure.

Drive Root/
└── Fest_Media/                 # The master directory for the app
    ├── Unsorted_Media/         # 📥 Raw files land here (Direct from frontend)
    ├── Students/               # 📂 Processed portraits and small groups (1-3 faces)
    │   ├── [Student_Name_A]/   # Individual student galleries
    │   └── [Student_Name_B]/
    ├── Group_Photos/           # 🧑‍🤝‍🧑 Processed files with > 3 faces
    ├── Unknown_Faces/          # ❓ Processed files with unrecognized faces (Admin review queue)
    └── .system/                # ⚙️ Hidden folder for reference data
        └── reference_faces/    # Master database of labeled faces for the Python script