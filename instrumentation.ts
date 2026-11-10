import type { Instrumentation } from "next";

/** Server errors → error_events (PRD §17). Only runs on the Node.js server runtime. */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { logError } = await import("@/lib/monitoring");
  await logError({
    source: "server",
    message: err instanceof Error ? err.message : String(err),
    digest: typeof err === "object" && err !== null && "digest" in err ? String((err as { digest: unknown }).digest) : null,
    path: request.path,
    route: context.routePath,
    kind: context.routeType,
  });
};
