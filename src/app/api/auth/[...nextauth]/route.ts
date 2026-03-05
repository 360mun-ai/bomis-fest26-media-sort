import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        }),
    ],
    callbacks: {
        async session({ session }) {
            if (session.user?.email) {
                // Expose a custom property on the session
                (session.user as { isApproved?: boolean }).isApproved = adminEmails.includes(session.user.email);
            }
            return session;
        },
    },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
