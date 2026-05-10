"use client";

export default function PendingPage() {
  return (
    <section className="min-h-screen bg-[#FDF8F3] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-2xl items-center justify-center">
        <div className="w-full rounded-3xl border border-[#800000]/10 bg-white/85 p-8 text-center shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b58a00]">
            Account Status
          </p>
          <h1 className="mt-3 text-3xl font-bold text-[#800000]">Pending Access</h1>
          <p className="mt-4 text-sm leading-relaxed text-[#5b3a3a]">
            Your session was found, but the portal could not load a complete profile yet.
            Please wait for approval or contact an administrator.
          </p>
        </div>
      </div>
    </section>
  );
}
