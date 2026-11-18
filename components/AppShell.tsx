"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { api, reportError, showWarnings } from "@/lib/client";
import { defaultSettings, type Post, type PostInput, type Settings } from "@/lib/schemas";
import { CaptionGenerator } from "./CaptionGenerator";
import { EditPostModal } from "./EditPostModal";
import { PostFeed } from "./PostFeed";
import { StatsRow } from "./StatsRow";
import { SettingsDrawer } from "./SettingsDrawer";
import { Spinner } from "./ui";

interface User {
  name: string;
  email: string;
  image: string | null;
}

interface PostsResponse {
  posts: Post[];
  syncedAt: string;
}

function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function AppShell({ user }: { user: User }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(() => defaultSettings(user.email));
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Post | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const postsRef = useRef(posts);
  postsRef.current = posts;

  const markSynced = () => setSyncedAt(new Date().toISOString());
  const setPending = (id: string, on: boolean) =>
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const load = useCallback(async () => {
    setSyncing(true);
    setLoadError(null);
    try {
      const [p, s] = await Promise.all([
        api<PostsResponse>("/api/posts"),
        api<{ settings: Settings; exists: boolean }>("/api/settings"),
      ]);
      setPosts(p.posts);
      setSyncedAt(p.syncedAt);
      setSettings(s.exists ? s.settings : { ...s.settings, timezone: browserTimezone() });
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Couldn't load your posts");
      reportError(err);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // ---- mutations (optimistic with rollback) ----
  async function createPost(input: PostInput): Promise<void> {
    const tempId = `temp-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const optimistic: Post = { id: tempId, ...input, status: "scheduled", createdAt: now, updatedAt: now };
    setPosts((prev) => [...prev, optimistic]);
    setPending(tempId, true);
    try {
      const res = await api<{ post: Post; warnings: string[] }>("/api/posts", { method: "POST", body: JSON.stringify(input) });
      setPosts((prev) => prev.map((p) => (p.id === tempId ? res.post : p)));
      markSynced();
      toast.success("Post scheduled and saved");
      showWarnings(res.warnings);
    } catch (err) {
      setPosts((prev) => prev.filter((p) => p.id !== tempId));
      reportError(err, "Couldn't schedule the post");
    } finally {
      setPending(tempId, false);
    }
  }

  async function updatePost(id: string, input: PostInput): Promise<void> {
    const before = postsRef.current.find((p) => p.id === id);
    if (!before) return;
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...input, updatedAt: new Date().toISOString() } : p)));
    setPending(id, true);
    try {
      const res = await api<{ post: Post; warnings: string[] }>(`/api/posts/${id}`, { method: "PATCH", body: JSON.stringify(input) });
      setPosts((prev) => prev.map((p) => (p.id === id ? res.post : p)));
      markSynced();
      toast.success("Post updated");
      showWarnings(res.warnings);
    } catch (err) {
      setPosts((prev) => prev.map((p) => (p.id === id ? before : p)));
      reportError(err, "Couldn't update the post");
    } finally {
      setPending(id, false);
    }
  }

  async function deletePost(post: Post): Promise<void> {
    const index = postsRef.current.findIndex((p) => p.id === post.id);
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
    try {
      const res = await api<{ warnings: string[] }>(`/api/posts/${post.id}`, { method: "DELETE" });
      markSynced();
      toast.success("Post deleted");
      showWarnings(res.warnings);
    } catch (err) {
      setPosts((prev) => {
        const next = [...prev];
        next.splice(Math.max(index, 0), 0, post);
        return next;
      });
      reportError(err, "Couldn't delete the post");
    }
  }

  async function saveSettings(next: Settings): Promise<void> {
    const res = await api<{ settings: Settings }>("/api/settings", { method: "PUT", body: JSON.stringify(next) });
    setSettings(res.settings);
    markSynced();
    toast.success("Settings saved");
  }

  const syncLabel = syncing ? "Syncing…" : syncedAt ? `Synced with Supabase · ${new Date(syncedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Not synced";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const first = user.name.split(" ")[0] ?? user.name;

  const navItem = "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-muted transition-colors hover:bg-muted-bg hover:text-fg";
  const avatar = (size: number) =>
    user.image ? (
      <Image src={user.image} alt="" width={size} height={size} referrerPolicy="no-referrer" className="rounded-full" />
    ) : (
      <span className="grid place-items-center rounded-full bg-muted-bg text-sm font-bold" style={{ width: size, height: size }}>
        {user.name.charAt(0).toUpperCase()}
      </span>
    );

  return (
    <div className="min-h-screen lg:pl-64">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-line bg-white p-4 lg:flex" aria-label="Sidebar">
        <div className="flex items-center gap-2.5 px-2 py-2 text-lg font-bold">
          <span className="accent-gradient grid h-9 w-9 place-items-center rounded-xl text-white" aria-hidden>
            ✦
          </span>
          AI Scheduler
        </div>
        <nav className="mt-6 space-y-1" aria-label="Main">
          <a href="#overview" className={`${navItem} !bg-violet-50 !text-violet-700`}>
            <span aria-hidden>▦</span> Dashboard
          </a>
          <a href="#create" className={navItem}>
            <span aria-hidden>✨</span> Create content
          </a>
          <a href="#feed" className={navItem}>
            <span aria-hidden>🗓️</span> Scheduled posts
          </a>
          <button type="button" className={navItem} onClick={() => setShowSettings(true)}>
            <span aria-hidden>⚙️</span> Settings
          </button>
        </nav>

        <div className="mt-auto space-y-3">
          <div className="rounded-xl border border-line bg-muted-bg p-3 text-xs" role="status">
            <div className="flex items-center gap-2 font-semibold">
              {syncing ? <Spinner /> : <span className={`h-2 w-2 rounded-full ${syncedAt ? "bg-ok" : "bg-muted"}`} aria-hidden />}
              {syncing ? "Syncing…" : "Database connected"}
            </div>
            <p className="mt-1 text-muted">{syncLabel}</p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-line p-2.5">
            {avatar(36)}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
            <button type="button" className="rounded-lg px-2 py-1 text-xs font-semibold text-muted hover:bg-muted-bg hover:text-danger" onClick={() => void signOut({ redirectTo: "/" })} aria-label="Sign out" title="Sign out">
              ⏻
            </button>
          </div>
        </div>
      </aside>

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-line bg-white/75 backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-8">
          <div className="flex items-center gap-2 font-bold lg:hidden">
            <span className="accent-gradient grid h-8 w-8 place-items-center rounded-lg text-white" aria-hidden>
              ✦
            </span>
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold sm:text-lg">
              {greeting}, {first} 👋
            </h1>
            <p className="hidden text-xs text-muted sm:block">Here&apos;s what&apos;s happening with your content.</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1.5 text-xs lg:hidden" role="status">
              {syncing ? <Spinner /> : <span className={`h-2 w-2 rounded-full ${syncedAt ? "bg-ok" : "bg-muted"}`} aria-hidden />}
              {syncing ? "Syncing…" : "Synced"}
            </div>
            <button type="button" className="btn btn-ghost !px-3" onClick={() => void load()} disabled={syncing} aria-label="Refresh" title="Refresh">
              ↻
            </button>
            <button type="button" className="btn btn-ghost !px-3 lg:hidden" onClick={() => setShowSettings(true)} aria-label="Open settings">
              ⚙
            </button>
            <a href="#create" className="btn btn-primary accent-gradient hidden sm:inline-flex">
              ＋ New post
            </a>
            <div className="relative lg:hidden">
              <button type="button" onClick={() => setMenuOpen((o) => !o)} aria-haspopup="menu" aria-expanded={menuOpen} aria-label="Account menu">
                {avatar(36)}
              </button>
              {menuOpen && (
                <div role="menu" className="card pop absolute right-0 mt-2 w-60 p-2" onKeyDown={(e) => e.key === "Escape" && setMenuOpen(false)}>
                  <div className="px-3 py-2">
                    <p className="truncate text-sm font-semibold">{user.name}</p>
                    <p className="truncate text-xs text-muted">{user.email}</p>
                  </div>
                  <button role="menuitem" type="button" className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted-bg" onClick={() => void signOut({ redirectTo: "/" })}>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="space-y-6 px-4 py-6 sm:px-8">
        <div id="overview" className="scroll-mt-24">
          <StatsRow posts={posts} loading={loading} timezone={settings.timezone} />
        </div>

        <div className="grid gap-6 xl:grid-cols-5 xl:items-start">
          <div id="create" className="scroll-mt-24 xl:col-span-2">
            <CaptionGenerator settings={settings} onCreate={createPost} />
          </div>
          <section id="feed" aria-labelledby="feed-h" className="scroll-mt-24 space-y-4 xl:col-span-3">
            <div className="flex items-baseline justify-between">
              <h2 id="feed-h" className="text-lg font-bold">
                Scheduled posts
              </h2>
              <span className="text-xs text-muted">Times shown in {settings.timezone}</span>
            </div>
            {loadError && !loading && (
              <div role="alert" className="card flex items-center justify-between gap-3 border-danger/40 p-4 text-sm">
                <span className="text-danger">{loadError}</span>
                <button type="button" className="btn btn-ghost" onClick={() => void load()}>
                  Retry
                </button>
              </div>
            )}
            <PostFeed posts={posts} loading={loading} timezone={settings.timezone} pendingIds={pendingIds} onEdit={setEditing} onDelete={(p) => void deletePost(p)} />
          </section>
        </div>
      </main>

      {editing && <EditPostModal post={editing} settings={settings} onClose={() => setEditing(null)} onSave={updatePost} />}
      {showSettings && <SettingsDrawer settings={settings} accountEmail={user.email} onSave={saveSettings} onClose={() => setShowSettings(false)} />}
    </div>
  );
}
