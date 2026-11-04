import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Verify a certificate" };

async function verify(formData: FormData) {
  "use server";
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  redirect(`/certificates/${encodeURIComponent(code || "none")}`);
}

export default function VerifyPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-12">
      <Link href="/" aria-label="Offbook home">
        <Wordmark className="h-6 w-auto" />
      </Link>
      <h1 className="text-3xl font-black">Verify a certificate</h1>
      <p className="text-muted">Enter the code printed on the certificate, like OB-ABCD-2345.</p>
      <form action={verify} className="flex gap-2">
        <label htmlFor="code" className="sr-only">
          Certificate code
        </label>
        <input id="code" name="code" required placeholder="OB-XXXX-XXXX" className="min-h-11 flex-1 rounded-band border-2 border-line px-3 font-mono uppercase" />
        <Button type="submit">Check</Button>
      </form>
    </main>
  );
}
