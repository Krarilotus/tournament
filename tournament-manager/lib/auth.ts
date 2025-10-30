import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongo";
import dbConnect from "@/lib/db";
import User from "@/lib/models/User";
import { authConfig } from "./auth.config";

const authSetup = NextAuth({
  ...authConfig,
  adapter: MongoDBAdapter(clientPromise),
  session: { strategy: "jwt" },

  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials.password) return null;
          await dbConnect();
          const user = await User.findOne({ email: credentials.email });
          if (!user || !user.password) return null;
          const ok = await user.comparePassword(credentials.password as string);
          if (!ok) return null;
          if (!user.emailVerified) {
            return { id: user.id, email: user.email, name: user.name, emailVerified: null } as any;
          }
          return { id: user.id, email: user.email, name: user.name } as any;
        } catch (e) {
          console.error("[authorize] fatal:", e);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) (token as any).emailVerified = (user as any).emailVerified ?? true;
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as any).emailVerified = (token as any).emailVerified ?? true;
      return session;
    },
  },
});

// Export what we need in pieces
export const { auth, signIn, signOut } = authSetup;
// IMPORTANT: export GET/POST functions, not the handlers object
export const GET = authSetup.handlers.GET;
export const POST = authSetup.handlers.POST;
