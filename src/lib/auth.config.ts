import type { NextAuthConfig } from "next-auth";

// Edge-compatible auth config (no Node.js-only dependencies like bcrypt, prisma, otplib)
export const authConfig = {
  pages: {
    signIn: "/logga-in",
    error: "/logga-in",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
  providers: [],
  session: { strategy: "jwt" },
} satisfies NextAuthConfig;
