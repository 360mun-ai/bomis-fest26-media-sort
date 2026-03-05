import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { registerUser, isUserApproved } from "@/lib/user-store";

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        }),
    ],
    callbacks: {
        async signIn({ user }) {
            // Register every user who signs in (idempotent, stored in Drive)
            if (user.email) {
                await registerUser(user.email, user.name || "Unknown", user.image || undefined);
            }
            return true;
        },
        async session({ session }) {
            if (session.user?.email) {
                const approved = await isUserApproved(session.user.email);
                (session.user as { isApproved?: boolean }).isApproved = approved;
            }
            return session;
        },
    },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
