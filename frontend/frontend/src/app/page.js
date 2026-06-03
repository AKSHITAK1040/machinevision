export default function Home() {
  return (
    <main className="min-h-screen bg-[linear-gradient(to_bottom,#f7f3ea,#f5f5f4)] px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <section className="rounded-3xl border-2 border-stone-300 bg-[#fffdf8] p-6 shadow-[6px_6px_0_rgba(120,113,108,0.12)] sm:p-8">
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-stone-500">
            MachineVision
          </p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
            Find products in a video
          </h1>
          <p className="mt-4 text-base leading-7 text-stone-600">
            Upload a video or try a demo. The app detects products, shows where they appear, and
            gives search links to explore them.
          </p>

          <div className="mt-6 space-y-3 rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-600">
            <p>1. Open upload if you want to test your own video.</p>
            <p>2. Open demo if you want to show the project quickly.</p>
            <p>3. Select a detected item and open the search links.</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/upload"
              className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white"
            >
              Open upload page
            </a>
            <a
              href="/watch"
              className="rounded-lg border-2 border-stone-300 bg-white px-5 py-3 text-sm text-stone-700"
            >
              Open demo page
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
