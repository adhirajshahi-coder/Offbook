import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CubeMark, Wordmark } from "@/components/brand/Logo";
import { certificateByCode } from "@/lib/portfolio";
import { PrintButton } from "./PrintButton";

export const metadata: Metadata = { title: "Certificate", robots: { index: false, follow: false } };

/** Printable certificate; the code doubles as verification (PRD §7.9). */
export default async function CertificatePage({ params }: PageProps<"/certificates/[code]">) {
  const { code } = await params;
  const cert = await certificateByCode(code.toUpperCase());
  if (!cert) notFound();
  const date = new Date(cert.issued_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

  return (
    <main className="flex min-h-full flex-1 flex-col items-center bg-[#f6f4fb] px-4 py-8 print:bg-white print:p-0">
      <div className="mb-4 flex w-full max-w-3xl items-center justify-between print:hidden">
        <Link href="/" aria-label="Offbook home">
          <Wordmark className="h-6 w-auto" />
        </Link>
        <PrintButton />
      </div>
      <article className="relative w-full max-w-3xl overflow-hidden rounded-2xl border-[6px] border-violet-600 bg-white px-8 py-12 text-center shadow-sm print:rounded-none print:shadow-none sm:px-14">
        <CubeMark className="mx-auto h-14 w-14" />
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-violet-700">Certificate of completion</p>
        <p className="mt-6 text-muted">This certifies that</p>
        <h1 className="mt-2 font-display text-4xl font-black sm:text-5xl">{cert.name}</h1>
        <p className="mt-6 text-muted">completed the Offbook {cert.kind}</p>
        <p className="mt-2 text-2xl font-black">{cert.title}</p>
        <p className="mx-auto mt-4 max-w-md text-sm text-muted">including every mission, the boss challenges and a reviewed capstone project.</p>
        <div className="mt-10 flex flex-wrap items-end justify-between gap-4 text-left text-sm">
          <div>
            <p className="font-semibold">{date}</p>
            <p className="text-muted">Date issued</p>
          </div>
          <div className="text-right">
            <p className="font-mono font-semibold">{cert.code}</p>
            <p className="text-muted">Verify at offbook.in/certificates</p>
          </div>
        </div>
      </article>
      <p className="mt-4 max-w-3xl text-center text-sm text-muted print:hidden">
        ✓ Verified: this certificate was issued by Offbook to {cert.name} on {date}.
      </p>
    </main>
  );
}
