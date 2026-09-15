import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/signin" },
  callbacks: {
    authorized({ token }) {
      return !!token;
    },
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/notes/:path*",
    "/projects/:path*",
    "/daily/:path*",
    "/tags/:path*",
    "/archive/:path*",
    "/settings/:path*",
    "/billing/:path*",
    "/onboarding/:path*",
    "/vault/:path*",
    "/calendar/:path*",
    "/journal/:path*",
    "/reader/:path*",
    "/review/:path*",
    "/planner/:path*",
    "/views/:path*",
    "/admin/:path*",
  ],
};
