"use client";

import type { Post, PostInput, Settings } from "@/lib/schemas";
import { Modal } from "./Modal";
import { PostForm } from "./PostForm";

interface Props {
  post: Post;
  settings: Settings;
  onSave: (id: string, input: PostInput) => Promise<void>;
  onClose: () => void;
}

export function EditPostModal({ post, settings, onSave, onClose }: Props) {
  return (
    <Modal title="Edit post" description="Changing the time re-queues the email reminder." onClose={onClose} wide>
      <PostForm
        initial={post}
        submitLabel="Save changes"
        globalNotificationsEnabled={settings.notificationsEnabled}
        onCancel={onClose}
        onSubmit={async (input) => {
          await onSave(post.id, input);
          onClose();
        }}
      />
    </Modal>
  );
}
