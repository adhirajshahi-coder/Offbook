"use client";

import { useState } from "react";
import { ActionMessage, Field, Select, TextArea, TextInput, useAction } from "@/components/hq/forms";
import { hqButton } from "@/components/hq/ui";
import { updateVideo } from "../actions";

type V = { id: string; title: string; teacher: string; trackId: string; tags: string; transcript: string; captionsUrl: string };

export function VideoForm({ video, tracks }: { video: V; tracks: { id: string; zone: string }[] }) {
  const [v, setV] = useState(video);
  const { pending, msg, run } = useAction();
  const set = (k: keyof V) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });
  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => updateVideo(video.id, { ...v, trackId: v.trackId || null }));
      }}
    >
      <Field label="Title">
        <TextInput value={v.title} onChange={set("title")} maxLength={120} required />
      </Field>
      <Field label="Teacher">
        <TextInput value={v.teacher} onChange={set("teacher")} maxLength={80} />
      </Field>
      <Field label="Zone">
        <Select value={v.trackId} onChange={set("trackId")}>
          <option value="">Not set</option>
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.zone}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Tags (comma separated)">
        <TextInput value={v.tags} onChange={set("tags")} />
      </Field>
      <Field label="Captions file (.vtt link)" className="md:col-span-2" hint="Every video needs captions (accessibility). Paste an https link to a .vtt file.">
        <TextInput value={v.captionsUrl} onChange={set("captionsUrl")} placeholder="https://…/captions.vtt" />
      </Field>
      <Field label="Transcript" className="md:col-span-2">
        <TextArea rows={5} value={v.transcript} onChange={set("transcript")} />
      </Field>
      <div className="flex items-center gap-3 md:col-span-2">
        <button disabled={pending} className={hqButton("primary")}>
          Save
        </button>
        <ActionMessage msg={msg} />
      </div>
    </form>
  );
}
