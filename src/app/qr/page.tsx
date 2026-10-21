import Image from "next/image";

/**
 * Project this page before voting: students scan the QR (or type the short
 * URL) and land straight on the ballot. Teacher-only in practice — it's just
 * never linked from the student flow.
 */
export default function QrPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      <p className="text-xs font-black tracking-[0.4em] text-amber-300 sm:text-sm">WAUKEE HIGH SCHOOL · AP CSP</p>
      <h1 className="font-display mt-3 max-w-3xl text-4xl font-black leading-tight sm:text-6xl">
        SSBU Developer <span className="text-amber-300">Awards</span>
      </h1>
      <p className="mt-3 text-lg font-semibold text-purple-100/90 sm:text-2xl">Scan to vote for your favorites!</p>

      <div className="mt-8 rounded-[2rem] border-2 border-amber-300/70 bg-white p-5 shadow-[0_0_60px_rgba(245,197,66,0.35)] sm:p-7">
        <Image
          src="/qr-mylineuppro-awards.png"
          alt="QR code linking to mylineuppro.com/awards"
          width={460}
          height={460}
          priority
          className="h-[min(52vh,460px)] w-[min(52vh,460px)]"
        />
      </div>

      <p className="font-display mt-8 text-2xl font-black tracking-wide text-white sm:text-4xl">
        mylineuppro.com<span className="text-amber-300">/awards</span>
      </p>
      <p className="mt-2 text-sm text-purple-200/70 sm:text-base">No account. No name. Just vote. 🏆</p>
    </main>
  );
}
