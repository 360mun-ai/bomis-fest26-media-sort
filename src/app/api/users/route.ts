import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

/**
 * User Management API
 * 
 * Manages the approved users list. On Vercel, this reads/writes to
 * .system/approved_users.json. For production, swap with a database.
 * 
 * GET  — List all users (pending + approved)
 * POST — Approve or reject a user by email
 */

interface UserEntry {
    email: string;
    name: string;
    image?: string;
    approved: boolean;
    requestedAt: string;
    approvedAt?: string;
}

function loadUsers(): UserEntry[] {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require("fs");
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const path = require("path");
        const filePath = path.join(process.cwd(), ".system", "approved_users.json");
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, "utf-8"));
        }
    } catch {
        // fs not available
    }
    return [];
}

function saveUsers(users: UserEntry[]) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require("fs");
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const path = require("path");
        const dir = path.join(process.cwd(), ".system");
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const filePath = path.join(dir, "approved_users.json");
        fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
    } catch {
        // fs not available on Vercel
    }
}

// Register a user (called from auth callback)
export function registerUser(email: string, name: string, image?: string) {
    const users = loadUsers();
    const existing = users.find((u) => u.email === email);
    if (!existing) {
        users.push({
            email,
            name,
            image,
            approved: false,
            requestedAt: new Date().toISOString(),
        });
        saveUsers(users);
    }
}

export function isUserApproved(email: string): boolean {
    const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
    if (adminEmails.includes(email)) return true;

    const users = loadUsers();
    const user = users.find((u) => u.email === email);
    return user?.approved === true;
}

// GET: List all users
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        const isAdmin = process.env.ADMIN_EMAILS?.split(",").includes(session?.user?.email || "");

        if (!session || !isAdmin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const users = loadUsers();
        const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];

        // Sort: pending first, then approved
        const sorted = [...users].sort((a, b) => {
            if (a.approved !== b.approved) return a.approved ? 1 : -1;
            return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
        });

        return NextResponse.json({
            users: sorted,
            adminEmails,
        }, { status: 200 });

    } catch (error: unknown) {
        console.error("Error listing users:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST: Approve or revoke a user
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const isAdmin = process.env.ADMIN_EMAILS?.split(",").includes(session?.user?.email || "");

        if (!session || !isAdmin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { email, action } = await req.json();

        if (!email || !["approve", "revoke"].includes(action)) {
            return NextResponse.json({ error: "Missing email or invalid action" }, { status: 400 });
        }

        const users = loadUsers();
        const userIndex = users.findIndex((u) => u.email === email);

        if (userIndex === -1) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (action === "approve") {
            users[userIndex].approved = true;
            users[userIndex].approvedAt = new Date().toISOString();
        } else {
            users[userIndex].approved = false;
            users[userIndex].approvedAt = undefined;
        }

        saveUsers(users);

        return NextResponse.json({
            status: action === "approve" ? "approved" : "revoked",
            email,
        }, { status: 200 });

    } catch (error: unknown) {
        console.error("Error updating user:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
