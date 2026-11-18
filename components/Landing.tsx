export function Landing({ action }: { action: () => Promise<void> }) {
  const features = [
    { icon: "✨", title: "3 AI captions", text: "Gemini writes three options tuned to the platform and tone you pick." },
    { icon: "🗂️", title: "Saved to Supabase", text: "Every post and setting is stored in your Supabase Postgres database, private to your account." },
    { icon: "⏰", title: "Exact-time reminders", text: "Email reminders are queued for the exact minute, with custom lead times." },
  ];
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-10 sm:px-6">
      <div className="flex items-center gap-2 text-lg font-bold">
        <span className="accent-gradient grid h-9 w-9 place-items-center rounded-xl text-white" aria-hidden>
          ✦
        </span>
        AI Post Scheduler
      </div>

      <section className="flex flex-1 flex-col items-center justify-center py-16 text-center">
        <p className="mb-4 rounded-full border border-line bg-card px-3 py-1 text-xs font-medium text-muted">
          Gemini · Supabase · Resend
        </p>
        <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">
          Write the post. <span className="accent-text">Schedule it.</span> Never forget it.
        </h1>
        <p className="mt-5 max-w-xl text-base text-muted sm:text-lg">
          Generate platform-perfect captions in seconds, save them securely, and get an email right when it&apos;s time to publish.
        </p>
        <form action={action} className="mt-8">
          <button type="submit" className="btn btn-primary accent-gradient px-6 py-3 text-base">
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
              <path fill="#fff" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36a12 12 0 1 1 0-24c3.1 0 5.8 1.2 8 3l5.7-5.7A20 20 0 1 0 44 24c0-1.3-.1-2.700-.4-3.900z" />
            </svg>
            Sign in with Google
          </button>
        </form>
        <p className="mt-3 text-xs text-muted">Google is used only to verify who you are (name and email).</p>
      </section>

      <section className="grid gap-4 pb-6 sm:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="card p-5">
            <div className="text-2xl" aria-hidden>
              {f.icon}
            </div>
            <h2 className="mt-3 font-semibold">{f.title}</h2>
            <p className="mt-1 text-sm text-muted">{f.text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
