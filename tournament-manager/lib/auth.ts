import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongo";
import dbConnect from "@/lib/db";
import User from "@/lib/models/User"; // Wichtig: User-Modell importieren
import { authConfig } from "./auth.config"; // Pfad ggf. anpassen

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

          // Gibt den Benutzer IMMER zurück, die Middleware prüft die Verifizierung
          return { 
            id: user.id, 
            email: user.email, 
            name: user.name, 
            emailVerified: user.emailVerified 
          } as any;
          
        } catch (e: any) {
          console.error("[authorize] error:", e);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    ...authConfig.callbacks, // Behält deine 'authorized'-Funktion
    
    async jwt({ token, user }) {
      // Fall 1: Initiales Login (das 'user'-Objekt ist vorhanden)
      if (user) {
        (token as any).id = user.id;
        (token as any).emailVerified = (user as any).emailVerified;
        return token;
      }

      // --- DAS IST DER FIX ---
      // Fall 2: Jede andere Token-Nutzung (z.B. Middleware, Session-Check)
      // Das 'user'-Objekt fehlt. Das Token ist möglicherweise veraltet.
      
      // Wir prüfen, ob die Verifizierung im Token fehlt (null)
      if (token && (token as any).emailVerified === null) {
        try {
          // Hole die frischen Daten aus der DB
          await dbConnect();
          const dbUser = await User.findById((token as any).id);
          if (dbUser) {
            // Aktualisiere das Token IN-MEMORY mit den frischen Daten
            (token as any).emailVerified = dbUser.emailVerified;
          }
        } catch (error) {
          console.error("Error refreshing token from DB:", error);
        }
      }
      // --- ENDE DES FIXES ---

      return token; // Gib das (potenziell aktualisierte) Token zurück
    },
    
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token as any).id;
        // Stelle sicher, dass der 'emailVerified'-Status (jetzt frisch) 
        // an die Client-Session übergeben wird
        (session.user as any).emailVerified = (token as any).emailVerified;
      }
      return session;
    },
  },
});

// Export was wir brauchen
export const { auth, signIn, signOut } = authSetup;
export const GET = authSetup.handlers.GET;
export const POST = authSetup.handlers.POST;