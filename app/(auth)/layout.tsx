import Link from "next/link";
import { Wordmark } from "@/components/brand/Logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-violet-50 px-4 py-12">
      <Link href="/" aria-label="Offbook home" className="mb-8">
        <Wordmark className="h-8 w-auto" />
      </Link>
      <div className="w-full max-w-sm rounded-[22px] border border-line bg-white p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}
