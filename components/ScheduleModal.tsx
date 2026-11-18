"use client";

import { useMemo } from "react";
import type { CaptionOption, Platform, PostInput, Settings } from "@/lib/schemas";
import { Modal } from "./Modal";
import { PostForm } from "./PostForm";

interface Props {
  option: CaptionOption;
  platform: Platform;
  topic: string;
  settings: Settings;
  onSave: (input: PostInput) => Promise<void>;
  onClose: () => void;
}

export function ScheduleModal({ option, platform, topic, settings, onSave, onClose }: Props) {
  const initial = useMemo(() => {
    const inOneHour = new Date(Math.ceil((Date.now() + 60 * 60_000) / 900_000) * 900_000);
    return {
      title: topic.length > 60 ? `${topic.slice(0, 57)}…` : topic,
      caption: option.caption,
      hashtags: option.hashtags,
      platform,
      scheduledAt: inOneHour.toISOString(),
      notes: "",
      notify: { enabled: settings.notificationsEnabled, leadMinutes: settings.defaultLeadMinutes },
    };
  }, [option, platform, topic, settings.notificationsEnabled, settings.defaultLeadMinutes]);

  return (
    <Modal title="Schedule post" description="Review the caption, then pick when to publish." onClose={onClose} wide>
      <PostForm
        initial={initial}
        submitLabel="Save & schedule"
        globalNotificationsEnabled={settings.notificationsEnabled}
        onCancel={onClose}
        onSubmit={async (input) => {
          await onSave(input);
          onClose();
        }}
      />
    </Modal>
  );
}
