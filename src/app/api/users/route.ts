import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { loadUsers, saveUsers } from "@/lib/user-store";

/**
 * User Management API
 * 
 * GET  — List all users (reads from Drive-stored JSON)
 * POST — Approve or revoke a user by email
 */

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        const isAdmin = process.env.ADMIN_EMAILS?.split(",").map(e => e.trim()).includes(session?.user?.email || "");

        if (!session || !isAdmin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const users = await loadUsers();
        const adminEmails = process.env.ADMIN_EMAILS?.split(",").map(e => e.trim()) || [];

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

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const isAdmin = process.env.ADMIN_EMAILS?.split(",").map(e => e.trim()).includes(session?.user?.email || "");

        if (!session || !isAdmin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { email, action } = await req.json();

        if (!email || !["approve", "revoke"].includes(action)) {
            return NextResponse.json({ error: "Missing email or invalid action" }, { status: 400 });
        }

        const users = await loadUsers();
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

        await saveUsers(users);

        return NextResponse.json({
            status: action === "approve" ? "approved" : "revoked",
            email,
        }, { status: 200 });

    } catch (error: unknown) {
        console.error("Error updating user:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
