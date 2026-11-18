"use client";

import { useId, useState } from "react";
import { LEAD_OPTIONS, PLATFORM_LIMITS, PLATFORMS, fullPostText, normalizeHashtag, platformSchema, type Platform, type PostInput } from "@/lib/schemas";
import { leadLabel, localInputToIso, toLocalInputValue } from "@/lib/time";
import { CharCounter, Field, Spinner } from "./ui";

export interface PostFormInitial {
  title: string;
  caption: string;
  hashtags: string[];
  platform: Platform;
  scheduledAt: string; // ISO
  notes: string;
  notify: { enabled: boolean; leadMinutes: number };
}

interface Props {
  initial: PostFormInitial;
  submitLabel: string;
  globalNotificationsEnabled: boolean;
  onSubmit: (input: PostInput) => Promise<void> | void;
  onCancel: () => void;
}

function parseTags(text: string): string[] {
  return text
    .split(/[\s,]+/)
    .map(normalizeHashtag)
    .filter(Boolean);
}

/** Shared by ScheduleModal and EditPostModal. */
export function PostForm({ initial, submitLabel, globalNotificationsEnabled, onSubmit, onCancel }: Props) {
  const uid = useId();
  const [title, setTitle] = useState(initial.title);
  const [caption, setCaption] = useState(initial.caption);
  const [tagsText, setTagsText] = useState(initial.hashtags.map((t) => `#${t}`).join(" "));
  const [platform, setPlatform] = useState<Platform>(initial.platform);
  const [when, setWhen] = useState(toLocalInputValue(initial.scheduledAt));
  const [notes, setNotes] = useState(initial.notes);
  const [notifyEnabled, setNotifyEnabled] = useState(initial.notify.enabled);
  const [lead, setLead] = useState(initial.notify.leadMinutes);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const hashtags = parseTags(tagsText);
  const over = fullPostText(caption, hashtags).length > PLATFORM_LIMITS[platform];
  const leadChoices = Array.from(new Set<number>([...LEAD_OPTIONS, lead])).sort((a, b) => a - b);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const iso = localInputToIso(when);
    if (!title.trim()) return setError("Add a title.");
    if (!caption.trim()) return setError("The caption can't be empty.");
    if (!iso) return setError("Pick a date and time.");
    // Only block past times when the time is new/changed (editing a past post's notes is fine).
    if (iso !== initial.scheduledAt && new Date(iso).getTime() <= Date.now()) return setError("Pick a time in the future.");
    if (over) return setError(`This exceeds the ${platform} character limit.`);
    setSaving(true);
    try {
      await onSubmit({ title: title.trim(), caption: caption.trim(), hashtags, platform, scheduledAt: iso, notes, notify: { enabled: notifyEnabled, leadMinutes: lead } });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="Title" htmlFor={`${uid}-title`}>
        <input id={`${uid}-title`} data-autofocus className="field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
      </Field>

      <Field label="Platform" htmlFor={`${uid}-platform`}>
        <select
          id={`${uid}-platform`}
          className="field"
          value={platform}
          onChange={(e) => {
            const parsed = platformSchema.safeParse(e.target.value);
            if (parsed.success) setPlatform(parsed.data);
          }}
        >
          {PLATFORMS.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </Field>

      <Field label="Caption" htmlFor={`${uid}-caption`} hint={<CharCounter platform={platform} caption={caption} hashtags={hashtags} />}>
        <textarea id={`${uid}-caption`} className="field min-h-32 resize-y" value={caption} onChange={(e) => setCaption(e.target.value)} required />
      </Field>

      <Field label="Hashtags" htmlFor={`${uid}-tags`} hint={<span className="text-xs text-muted">space or comma separated</span>}>
        <input id={`${uid}-tags`} className="field" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="#growth #marketing" />
      </Field>

      <Field label="Publish at (your local time)" htmlFor={`${uid}-when`}>
        <input id={`${uid}-when`} type="datetime-local" className="field" value={when} onChange={(e) => setWhen(e.target.value)} required />
      </Field>

      <Field label="Task notes" htmlFor={`${uid}-notes`}>
        <textarea id={`${uid}-notes`} className="field min-h-20 resize-y" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Attach the product photo before posting" maxLength={2000} />
      </Field>

      <fieldset className="rounded-xl border border-line bg-muted-bg p-3">
        <legend className="px-1 text-sm font-medium">Email reminder</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-violet-600" checked={notifyEnabled} onChange={(e) => setNotifyEnabled(e.target.checked)} />
          Remind me by email for this post
        </label>
        {!globalNotificationsEnabled && notifyEnabled && (
          <p className="mt-1 text-xs text-warn">Notifications are turned off globally in Settings, so no email will be sent.</p>
        )}
        <div className="mt-3">
          <label htmlFor={`${uid}-lead`} className="mb-1 block text-xs text-muted">
            Send reminder
          </label>
          <select id={`${uid}-lead`} className="field" value={lead} disabled={!notifyEnabled} onChange={(e) => setLead(Number(e.target.value))}>
            {leadChoices.map((m) => (
              <option key={m} value={m}>
                {leadLabel(m)}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary accent-gradient" disabled={saving}>
          {saving && <Spinner />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
