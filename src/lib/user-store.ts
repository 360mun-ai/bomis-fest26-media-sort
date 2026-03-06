import { supabase } from "./supabase";

function getAdminEmails(): string[] {
    return process.env.ADMIN_EMAILS?.split(",").map(e => e.trim()) || [];
}

export interface UserEntry {
    email: string;
    name: string;
    image?: string;
    approved: boolean;
    requestedAt: string;
    approvedAt?: string;
}

export async function loadUsers(): Promise<UserEntry[]> {
    if (!supabase) return [];

    try {
        const { data, error } = await supabase
            .from("users")
            .select("email, name, image, approved, requested_at, approved_at");

        if (error) throw error;

        return (data || []).map(row => ({
            email: row.email,
            name: row.name,
            image: row.image,
            approved: row.approved,
            requestedAt: row.requested_at,
            approvedAt: row.approved_at
        }));
    } catch (e) {
        console.error("[UserStore] Failed to load users from Supabase:", e);
        return [];
    }
}

export async function saveUsers(users: UserEntry[]): Promise<void> {
    // This function is no longer needed in the same way, as we'll update 
    // individuals directly in Supabase rather than overwriting a whole file.
    console.warn("[UserStore] saveUsers called, but Supabase uses direct row-level operations.");
}

export async function registerUser(email: string, name: string, image?: string): Promise<void> {
    if (!supabase) return;

    try {
        // Since we have email as unique, we can attempt an insert and it will
        // fail gracefully if it already exists (or we can upsert if we want to update names/images).
        // Let's do a simple insert.
        const { error } = await supabase
            .from("users")
            .insert([
                {
                    email,
                    name,
                    image,
                    approved: getAdminEmails().includes(email), // Auto-approve admins
                }
            ]);

        // Code 23505 is unique violation, which is fine (user already exists)
        if (error && error.code !== "23505") {
            console.error("[UserStore] Error registering user:", error);
        }
    } catch (e) {
        console.error("[UserStore] Failed to register user:", e);
    }
}

export async function isUserApproved(email: string): Promise<boolean> {
    if (getAdminEmails().includes(email)) return true;
    if (!supabase) return false;

    try {
        const { data, error } = await supabase
            .from("users")
            .select("approved")
            .eq("email", email)
            .single();

        if (error) {
            // PGRST116 means zero rows found
            if (error.code !== "PGRST116") {
                console.error("[UserStore] Error checking approval:", error);
            }
            return false;
        }

        return data?.approved === true;
    } catch (e) {
        console.error("[UserStore] Failed checking approval:", e);
        return false;
    }
}
