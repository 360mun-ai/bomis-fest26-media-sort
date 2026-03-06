import { drive } from "@/lib/drive";

/**
 * User Registry — Stored as a JSON file in Google Drive
 * 
 * This stores approved_users.json in the user's Google Drive (in
 * a hidden _config folder). This persists across Vercel serverless
 * invocations because it uses the Drive API, not the local filesystem.
 */

const CONFIG_FILE_NAME = "_bomis_approved_users.json";

interface UserEntry {
    email: string;
    name: string;
    image?: string;
    approved: boolean;
    requestedAt: string;
    approvedAt?: string;
}

// ---- Drive-backed storage ----

async function findConfigFileId(): Promise<string | null> {
    try {
        const res = await drive.files.list({
            q: `name = '${CONFIG_FILE_NAME}' and trashed = false`,
            fields: "files(id)"
        });
        return res.data.files?.[0]?.id || null;
    } catch (e) {
        console.error("[UserStore] Failed to search for config file:", e);
        return null;
    }
}

export async function loadUsers(): Promise<UserEntry[]> {
    try {
        const fileId = await findConfigFileId();
        if (!fileId) return [];

        const res = await drive.files.get(
            { fileId, alt: "media" },
            { responseType: "text" }
        );
        return JSON.parse(res.data as string);
    } catch (e) {
        console.error("[UserStore] Failed to read users:", e);
        return [];
    }
}

export async function saveUsers(users: UserEntry[]): Promise<void> {
    try {
        const content = JSON.stringify(users, null, 2);
        const fileId = await findConfigFileId();

        if (fileId) {
            // Update existing file
            await drive.files.update({
                fileId,
                media: {
                    mimeType: "application/json",
                    body: content,
                },
            });
        } else {
            // Create new file
            await drive.files.create({
                requestBody: {
                    name: CONFIG_FILE_NAME,
                    mimeType: "application/json",
                },
                media: {
                    mimeType: "application/json",
                    body: content,
                },
            });
        }
    } catch (e) {
        console.error("[UserStore] Failed to save users:", e);
    }
}

export async function registerUser(email: string, name: string, image?: string): Promise<void> {
    const users = await loadUsers();
    const existing = users.find((u) => u.email === email);
    if (!existing) {
        users.push({
            email,
            name,
            image,
            approved: false,
            requestedAt: new Date().toISOString(),
        });
        await saveUsers(users);
    }
}

export async function isUserApproved(email: string): Promise<boolean> {
    // Admins are always approved
    const adminEmails = process.env.ADMIN_EMAILS?.split(",").map(e => e.trim()) || [];
    if (adminEmails.includes(email)) return true;

    // Check the Drive-stored approved users list
    const users = await loadUsers();
    const user = users.find((u) => u.email === email);
    return user?.approved === true;
}
