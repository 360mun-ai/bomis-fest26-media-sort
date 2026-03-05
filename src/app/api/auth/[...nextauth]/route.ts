import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { registerUser, isUserApproved } from "@/app/api/users/route";

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        }),
    ],
    callbacks: {
        async signIn({ user }) {
            // Register every user who signs in (idempotent)
            if (user.email) {
                registerUser(user.email, user.name || "Unknown", user.image || undefined);
            }
            return true; // Allow sign-in, but approval check happens in session callback
        },
        async session({ session }) {
            if (session.user?.email) {
                const approved = isUserApproved(session.user.email);
                (session.user as { isApproved?: boolean }).isApproved = approved;
            }
            return session;
        },
    },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
