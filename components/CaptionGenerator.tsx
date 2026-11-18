"use client";

import { useId, useRef, useState } from "react";
import { api, reportError } from "@/lib/client";
import {
  PLATFORMS,
  TONES,
  platformSchema,
  toneSchema,
  type CaptionOption,
  type Platform,
  type PostInput,
  type Settings,
  type Tone,
} from "@/lib/schemas";
import { CaptionCard } from "./CaptionCard";
import { ScheduleModal } from "./ScheduleModal";
import { Field, Spinner } from "./ui";

interface Props {
  settings: Settings;
  onCreate: (input: PostInput) => Promise<void>;
}

export function CaptionGenerator({ settings, onCreate }: Props) {
  const uid = useId();
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState<Platform>("Instagram");
  const [tone, setTone] = useState<Tone>("Casual");
  const [options, setOptions] = useState<CaptionOption[] | null>(null);
  const [generatedFor, setGeneratedFor] = useState<{ topic: string; platform: Platform } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CaptionOption | null>(null);
  const requestId = useRef(0);

  async function generate(e?: React.FormEvent) {
    e?.preventDefault();
    if (topic.trim().length < 3) {
      setError("Tell me what the post is about (at least a few words).");
      return;
    }
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ options: CaptionOption[] }>("/api/generate", {
        method: "POST",
        body: JSON.stringify({ topic, platform, tone }),
      });
      if (id !== requestId.current) return;
      setOptions(data.options);
      setGeneratedFor({ topic: topic.trim(), platform });
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err instanceof Error ? err.message : "Couldn't generate captions");
      reportError(err);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }

  return (
    <section aria-labelledby={`${uid}-h`} className="space-y-4">
      <form onSubmit={generate} className="card space-y-4 p-5">
        <div>
          <h2 id={`${uid}-h`} className="text-lg font-bold">
            Generate captions
          </h2>
          <p className="text-sm text-muted">Describe the post and get three options tailored to the platform.</p>
        </div>

        <Field label="What's the post about?" htmlFor={`${uid}-topic`} hint={<span className="text-xs text-muted">{topic.length}/1000</span>}>
          <textarea
            id={`${uid}-topic`}
            className="field min-h-28 resize-y"
            value={topic}
            maxLength={1000}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void generate();
            }}
            placeholder="e.g. Launching our new eco-friendly water bottle this Friday"
            disabled={loading}
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Platform" htmlFor={`${uid}-platform`}>
            <select
              id={`${uid}-platform`}
              className="field"
              value={platform}
              disabled={loading}
              onChange={(e) => {
                const p = platformSchema.safeParse(e.target.value);
                if (p.success) setPlatform(p.data);
              }}
            >
              {PLATFORMS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
          <Field label="Tone" htmlFor={`${uid}-tone`}>
            <select
              id={`${uid}-tone`}
              className="field"
              value={tone}
              disabled={loading}
              onChange={(e) => {
                const t = toneSchema.safeParse(e.target.value);
                if (t.success) setTone(t.data);
              }}
            >
              {TONES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary accent-gradient w-full py-3" disabled={loading}>
          {loading ? <Spinner /> : "✨"} {loading ? "Generating…" : options ? "Generate again" : "Generate 3 captions"}
        </button>
      </form>

      <div aria-live="polite" aria-busy={loading} className="space-y-3">
        {loading &&
          [0, 1, 2].map((i) => (
            <div key={i} className="card space-y-3 p-4" aria-hidden>
              <div className="skeleton h-3 w-20" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-11/12" />
              <div className="skeleton h-4 w-2/3" />
              <div className="flex gap-2 pt-1">
                <div className="skeleton h-9 w-20" />
                <div className="skeleton h-9 flex-1" />
              </div>
            </div>
          ))}

        {!loading && options && generatedFor && (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted">3 options for {generatedFor.platform}</h3>
              <button type="button" className="btn btn-ghost !py-1.5" onClick={() => void generate()}>
                ↻ Regenerate
              </button>
            </div>
            {options.map((o, i) => (
              <CaptionCard key={`${i}-${o.caption.slice(0, 20)}`} index={i} option={o} platform={generatedFor.platform} onSelect={() => setSelected(o)} />
            ))}
          </>
        )}
      </div>

      {selected && generatedFor && (
        <ScheduleModal
          option={selected}
          platform={generatedFor.platform}
          topic={generatedFor.topic}
          settings={settings}
          onClose={() => setSelected(null)}
          onSave={onCreate}
        />
      )}
    </section>
  );
}
