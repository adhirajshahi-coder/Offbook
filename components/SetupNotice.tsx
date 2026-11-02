/** Shown in place of sign-in features until Supabase keys are in .env.local. */
export function SetupNotice() {
  return (
    <div className="rounded-band border border-line bg-surface-2 p-4 text-sm">
      <p className="font-semibold">Sign-in isn&apos;t set up yet</p>
      <p className="mt-1 text-muted">
        Add the Supabase keys to <code>.env.local</code> (see{" "}
        <code>.env.example</code>), then restart the dev server.
      </p>
    </div>
  );
}
