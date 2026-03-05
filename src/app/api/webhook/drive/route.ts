import { NextRequest, NextResponse } from "next/server";

/**
 * Google Drive Webhook Receiver
 * 
 * On Vercel (serverless): Logs the event to console. The Python sorter polls Drive directly
 * and doesn't depend on queue.json in production.
 * 
 * Locally (self-hosted): Also writes to queue.json so the local Python sorter can wake
 * up immediately instead of waiting for the next poll cycle.
 */

// Dynamic import — fs is only available in Node.js, not in Vercel Edge
let fsModule: typeof import("fs") | null = null;
let pathModule: typeof import("path") | null = null;

try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    fsModule = require("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    pathModule = require("path");
} catch {
    // Running in an environment without fs (e.g. Vercel Edge)
}

function writeToLocalQueue(event: Record<string, unknown>) {
    if (!fsModule || !pathModule) return; // Skip on Vercel

    const queuePath = pathModule.join(process.cwd(), "queue.json");
    let queue: Record<string, unknown>[] = [];

    try {
        if (fsModule.existsSync(queuePath)) {
            const data = fsModule.readFileSync(queuePath, "utf-8");
            if (data) queue = JSON.parse(data);
        }
    } catch {
        queue = [];
    }

    queue.push(event);
    fsModule.writeFileSync(queuePath, JSON.stringify(queue, null, 2));
}

export async function POST(req: NextRequest) {
    try {
        const resourceState = req.headers.get("x-goog-resource-state");
        const channelId = req.headers.get("x-goog-channel-id");
        const resourceId = req.headers.get("x-goog-resource-id");

        if (!resourceState) {
            return NextResponse.json({ error: "Missing Google headers" }, { status: 400 });
        }

        if (resourceState === "sync") {
            console.log("Drive Webhook Sync Successful:", { channelId, resourceId });
            return NextResponse.json({ status: "sync OK" }, { status: 200 });
        }

        const event = {
            timestamp: new Date().toISOString(),
            event: "drive_update",
            resourceState,
            channelId,
        };

        // Always log to server console (works on Vercel)
        console.log("[WEBHOOK]", event);

        // Also write to local queue.json if running locally
        writeToLocalQueue(event);

        return NextResponse.json({ status: "logged" }, { status: 200 });

    } catch (error: unknown) {
        console.error("Webhook processing error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
