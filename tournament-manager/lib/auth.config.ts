import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isVerified = (auth?.user as any)?.emailVerified; 
      
      // Prüfen, ob dies der API-Aufruf zum Einloggen ist
      const isLoggingIn = nextUrl.pathname.startsWith("/api/auth/callback/credentials");

      // Fall 1: Der Benutzer versucht, sich gerade einzuloggen.
      // IMMER erlauben! Die `authorize`-Funktion wird ein frisches Token ausstellen.
      if (isLoggingIn) {
        return true;
      }

      // Reguläre Pfad-Prüfungen
      const isDashboard = nextUrl.pathname.startsWith("/dashboard");
      if (isDashboard) {
        // Fall 2: Eingeloggt UND Verifiziert -> Zugriff erlaubt
        if (isLoggedIn && isVerified) return true;
        
        // Fall 3: Eingeloggt, ABER NICHT Verifiziert
        if (isLoggedIn && !isVerified) {
          // Wirf ihn raus und schicke ihn zur Login-Seite
          return Response.redirect(new URL("/login?error=NotVerified", nextUrl));
        }

        // Fall 4: Nicht eingeloggt -> Zugriff verboten
        return false;
      }

      // Logik für eingeloggte Benutzer auf öffentlichen Seiten
      if (
        isLoggedIn &&
        (nextUrl.pathname.startsWith("/login") || nextUrl.pathname.startsWith("/register"))
      ) {
        if (isVerified) {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
        if (!isVerified && nextUrl.pathname.startsWith("/login")) {
          return true;
        }
         if (!isVerified && nextUrl.pathname.startsWith("/register")) {
          return Response.redirect(new URL("/login?error=NotVerified", nextUrl));
        }
      }
      
      // Fall 5: Alle anderen Fälle (Gast auf Homepage etc.) -> Zugriff erlaubt
      return true;
    },
  },
} satisfies NextAuthConfig;