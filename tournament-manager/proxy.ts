import { auth } from "@/lib/auth";

// Exportiere die 'auth'-Funktion als 'proxy'
export { auth as proxy } from "@/lib/auth";

// Der config-Export ist entscheidend
export const config = {
  matcher: [
    /*
     * Wir müssen explizit die eine API-Route angeben,
     * die die Middleware prüfen MUSS.
     */
    "/api/auth/callback/credentials",

    /*
     * Jetzt matchen wir alle anderen Routen,
     * AUSSER denen, die mit /api/ (also /api/tournaments etc.),
     * _next/static, _next/image, oder favicon.ico beginnen.
     */
    "/((?!api/|_next/static|_next/image|favicon.ico).*)",
  ],
};