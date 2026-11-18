"use client";

import { useId, useState } from "react";
import { toast } from "sonner";
import { api, reportError } from "@/lib/client";
import { DEFAULT_SUBJECT, LEAD_OPTIONS, settingsSchema, type Settings } from "@/lib/schemas";
import { leadLabel } from "@/lib/time";
import { Modal } from "./Modal";
import { Field, Spinner } from "./ui";

interface Props {
  settings: Settings;
  accountEmail: string;
  onSave: (settings: Settings) => Promise<void>;
  onClose: () => void;
}

export function SettingsDrawer({ settings, accountEmail, onSave, onClose }: Props) {
  const uid = useId();
  const [draft, setDraft] = useState<Settings>(settings);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const zones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
  const timezones = zones.includes(draft.timezone) ? zones : [draft.timezone, ...zones];

  function validate(): Settings | null {
    const parsed = settingsSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid settings");
      return null;
    }
    setError(null);
    return parsed.data;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const valid = validate();
    if (!valid) return;
    setSaving(true);
    try {
      await onSave(valid);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save settings");
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    const valid = validate();
    if (!valid) return;
    setTesting(true);
    try {
      const res = await api<{ to: string }>("/api/test-email", { method: "POST", body: JSON.stringify({ settings: valid }) });
      toast.success(`Test email sent to ${res.to}`);
    } catch (err) {
      reportError(err);
    } finally {
      setTesting(false);
    }
  }

  return (
    <Modal side title="Settings" description="Saved to your account." onClose={onClose}>
      <form onSubmit={save} className="space-y-5" noValidate>
        <label className="flex items-center justify-between gap-3 rounded-xl border border-line bg-muted-bg p-3 text-sm font-medium">
          Email notifications
          <input type="checkbox" className="h-5 w-5 accent-violet-600" checked={draft.notificationsEnabled} onChange={(e) => set("notificationsEnabled", e.target.checked)} />
        </label>

        <Field label="Recipient email" htmlFor={`${uid}-to`} hint={<span className="text-xs text-muted">blank = {accountEmail}</span>}>
          <input id={`${uid}-to`} type="email" className="field" value={draft.recipientEmail} onChange={(e) => set("recipientEmail", e.target.value)} placeholder={accountEmail} />
        </Field>

        <Field label="Default reminder lead time" htmlFor={`${uid}-lead`}>
          <select id={`${uid}-lead`} className="field" value={draft.defaultLeadMinutes} onChange={(e) => set("defaultLeadMinutes", Number(e.target.value))}>
            {LEAD_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {leadLabel(m)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Subject template" htmlFor={`${uid}-subject`} hint={<span className="text-xs text-muted">{"{{title}} {{platform}} {{time}}"}</span>}>
          <input id={`${uid}-subject`} className="field" value={draft.subjectTemplate} onChange={(e) => set("subjectTemplate", e.target.value)} />
          <button type="button" className="mt-1 text-xs text-muted underline" onClick={() => set("subjectTemplate", DEFAULT_SUBJECT)}>
            Reset to default
          </button>
        </Field>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-violet-600" checked={draft.includeCaption} onChange={(e) => set("includeCaption", e.target.checked)} />
          Include the caption in emails
        </label>

        <Field label="Signature" htmlFor={`${uid}-sig`}>
          <textarea id={`${uid}-sig`} className="field min-h-16 resize-y" value={draft.signature} maxLength={500} onChange={(e) => set("signature", e.target.value)} />
        </Field>

        <Field label="Timezone" htmlFor={`${uid}-tz`}>
          <select id={`${uid}-tz`} className="field" value={draft.timezone} onChange={(e) => set("timezone", e.target.value)}>
            {timezones.map((z) => (
              <option key={z}>{z}</option>
            ))}
          </select>
        </Field>

        {error && (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex flex-wrap justify-between gap-2 border-t border-line pt-4">
          <button type="button" className="btn btn-ghost" onClick={sendTest} disabled={testing || saving}>
            {testing && <Spinner />} Send test email
          </button>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary accent-gradient" disabled={saving}>
              {saving && <Spinner />} Save
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
