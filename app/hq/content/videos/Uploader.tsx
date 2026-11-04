"use client";

import * as UpChunk from "@mux/upchunk";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Field, Select, TextInput } from "@/components/hq/forms";
import { Notice, hqButton } from "@/components/hq/ui";
import { markUploaded, markUploadFailed, startUploads } from "./actions";

type Item = { file: File; title: string; progress: number; state: "queued" | "uploading" | "done" | "failed"; error?: string };

const ACCEPT = "video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm";
const MAX_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

/** Drag and drop, multiple files, resumable chunked upload straight to Mux. */
export function Uploader({ tracks, configured }: { tracks: { id: string; zone: string }[]; configured: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [teacher, setTeacher] = useState("");
  const [trackId, setTrackId] = useState("");
  const [tags, setTags] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  function add(files: FileList | null) {
    if (!files) return;
    const next: Item[] = [];
    for (const f of Array.from(files)) {
      if (!/\.(mp4|mov|webm)$/i.test(f.name) && !f.type.startsWith("video/")) {
        setError(`${f.name} isn't a video. Use mp4, mov or webm.`);
        continue;
      }
      if (f.size > MAX_BYTES) {
        setError(`${f.name} is over 2 GB. Trim it or export at a lower quality.`);
        continue;
      }
      next.push({ file: f, title: f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "), progress: 0, state: "queued" });
    }
    setItems((list) => [...list, ...next].slice(0, 10));
  }

  const patch = (i: number, p: Partial<Item>) => setItems((list) => list.map((x, k) => (k === i ? { ...x, ...p } : x)));

  async function upload() {
    setError(null);
    setBusy(true);
    const queued = items.map((it, i) => ({ it, i })).filter(({ it }) => it.state === "queued" || it.state === "failed");
    const res = await startUploads(
      queued.map(({ it }) => ({ title: it.title, teacher, trackId: trackId || null, tags: tags.split(",").map((t) => t.trim()).filter(Boolean) })),
    );
    if (!res.ok || !res.uploads) {
      setError(res.error ?? "Couldn't start the upload.");
      setBusy(false);
      return;
    }
    await Promise.all(
      queued.map(
        ({ it, i }, n) =>
          new Promise<void>((resolve) => {
            const { videoId, url } = res.uploads![n];
            patch(i, { state: "uploading", progress: 0 });
            const up = UpChunk.createUpload({ endpoint: url, file: it.file, chunkSize: 5120 });
            up.on("progress", (e) => patch(i, { progress: Math.round(e.detail) }));
            up.on("error", async (e) => {
              const reason = `Upload stopped: ${e.detail?.message ?? "connection problem"}. Try again.`;
              patch(i, { state: "failed", error: reason });
              await markUploadFailed(videoId, reason);
              resolve();
            });
            up.on("success", async () => {
              patch(i, { state: "done", progress: 100 });
              await markUploaded(videoId);
              resolve();
            });
          }),
      ),
    );
    setBusy(false);
    router.refresh();
  }

  if (!configured) {
    return <Notice tone="warn">Video upload isn&apos;t switched on yet. Add the Mux keys (MUX_TOKEN_ID, MUX_TOKEN_SECRET and the signing key) to the server settings.</Notice>;
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          add(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center ${over ? "border-violet-600 bg-[#f5f0ff]" : "border-[#d9d6e2] bg-[#fafafb]"}`}
      >
        <p className="font-semibold">Drop videos here</p>
        <p className="text-xs text-[#6b6778]">mp4, mov or webm. Aim for 2 to 5 minute clips, one idea per clip.</p>
        <button type="button" className={hqButton("secondary")} onClick={() => input.current?.click()}>
          Choose files
        </button>
        <input ref={input} type="file" accept={ACCEPT} multiple hidden onChange={(e) => add(e.target.files)} />
      </div>

      {items.length > 0 && (
        <>
          <div className="grid gap-2 md:grid-cols-3">
            <Field label="Teacher">
              <TextInput value={teacher} onChange={(e) => setTeacher(e.target.value)} maxLength={80} />
            </Field>
            <Field label="Zone">
              <Select value={trackId} onChange={(e) => setTrackId(e.target.value)}>
                <option value="">Not set</option>
                {tracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.zone}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Tags (comma separated)">
              <TextInput value={tags} onChange={(e) => setTags(e.target.value)} />
            </Field>
          </div>
          <ul className="divide-y divide-[#eeecf2] rounded-lg border border-[#e4e2ea] bg-white">
            {items.map((it, i) => (
              <li key={i} className="flex flex-wrap items-center gap-3 px-3 py-2">
                <TextInput
                  aria-label={`Title for ${it.file.name}`}
                  value={it.title}
                  disabled={it.state === "uploading" || it.state === "done"}
                  onChange={(e) => patch(i, { title: e.target.value })}
                  className="max-w-sm flex-1"
                />
                <span className="text-xs text-[#6b6778]">{(it.file.size / 1048576).toFixed(0)} MB</span>
                <div className="h-2 w-40 overflow-hidden rounded-full bg-[#eeecf2]" role="progressbar" aria-valuenow={it.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${it.title} upload progress`}>
                  <div className="h-full bg-violet-600 transition-[width]" style={{ width: `${it.progress}%` }} />
                </div>
                <span className="text-xs font-semibold">
                  {it.state === "queued" && "Ready"}
                  {it.state === "uploading" && `${it.progress}%`}
                  {it.state === "done" && "Uploaded, processing"}
                  {it.state === "failed" && <span className="text-[#b4233f]">{it.error}</span>}
                </span>
                {it.state === "queued" && (
                  <button type="button" className={hqButton("ghost", "h-7 px-2")} onClick={() => setItems((l) => l.filter((_, k) => k !== i))}>
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3">
            <button type="button" disabled={busy || !items.some((i) => i.state === "queued" || i.state === "failed")} onClick={upload} className={hqButton("primary")}>
              {busy ? "Uploading…" : items.some((i) => i.state === "failed") ? "Try again" : "Upload"}
            </button>
            <span className="text-xs text-[#6b6778]">You can keep working; uploads resume if the connection blips.</span>
          </div>
        </>
      )}
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
