"use client";

import { toast } from "sonner";
import { fullPostText, type CaptionOption, type Platform } from "@/lib/schemas";
import { CharCounter } from "./ui";

interface Props {
  index: number;
  option: CaptionOption;
  platform: Platform;
  onSelect: () => void;
}

export function CaptionCard({ index, option, platform, onSelect }: Props) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(fullPostText(option.caption, option.hashtags));
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Couldn't access the clipboard");
    }
  }
  return (
    <article className="card pop flex flex-col gap-3 p-4" aria-label={`Option ${index + 1}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-muted">Option {index + 1}</span>
        <CharCounter platform={platform} caption={option.caption} hashtags={option.hashtags} />
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{option.caption}</p>
      {option.hashtags.length > 0 && (
        <p className="flex flex-wrap gap-1.5">
          {option.hashtags.map((t) => (
            <span key={t} className="rounded-full bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-700">
              #{t}
            </span>
          ))}
        </p>
      )}
      <div className="mt-1 flex gap-2">
        <button type="button" className="btn btn-ghost" onClick={copy}>
          Copy
        </button>
        <button type="button" className="btn btn-primary accent-gradient flex-1" onClick={onSelect}>
          Select &amp; Schedule
        </button>
      </div>
    </article>
  );
}
