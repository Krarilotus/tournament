// proxy.ts
export { auth as proxy } from "@/lib/auth";
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
