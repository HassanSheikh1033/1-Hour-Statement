import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Google is used for identity only (openid/email/profile). Posts live in Supabase.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      authorization: { params: { scope: "openid email profile", prompt: "select_account" } },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/", error: "/" },
});
