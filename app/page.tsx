import { auth, signIn } from "@/auth";
import { AppShell } from "@/components/AppShell";
import { Landing } from "@/components/Landing";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();
  if (!session?.user?.email) {
    async function login() {
      "use server";
      await signIn("google", { redirectTo: "/" });
    }
    return <Landing action={login} />;
  }
  return (
    <AppShell
      user={{
        name: session.user.name ?? session.user.email,
        email: session.user.email,
        image: session.user.image ?? null,
      }}
    />
  );
}
