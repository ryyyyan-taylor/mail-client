export { auth as middleware } from "@/auth"

export const config = {
  matcher: [
    // Protect all routes except login, api/auth, and static assets
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
}
