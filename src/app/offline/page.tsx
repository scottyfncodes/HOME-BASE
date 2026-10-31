import { Logo } from "@/components/layout/logo";

export const metadata = { title: "Offline" };
export const dynamic = "force-static";

/*
 * Lists the pages the service worker saved. Inline on purpose: this page is
 * shown with no connection, when the app's own JavaScript may not be cached.
 */
const listSaved = `(async () => {
  const list = document.getElementById("saved");
  const empty = document.getElementById("saved-empty");
  const labels = [[/^\\/home$/, "Home"], [/^\\/preparedness$/, "Preparedness: shutoffs and emergency info"], [/^\\/preparedness\\//, "Preparedness item"], [/^\\/providers$/, "Service providers"], [/^\\/providers\\//, "Service provider"], [/^\\/pets$/, "Pets"], [/^\\/pets\\//, "Pet profile"]];
  try {
    const keys = await (await caches.open("hb-pages-v1")).keys();
    const paths = keys.map((k) => new URL(k.url).pathname).sort();
    for (const p of paths) {
      const a = document.createElement("a");
      a.href = p;
      a.className = "flex px-4 py-3 min-h-12 items-center text-[15px] font-medium";
      a.textContent = (labels.find(([re]) => re.test(p)) || [null, p])[1];
      const li = document.createElement("li");
      li.appendChild(a);
      list.appendChild(li);
    }
    if (paths.length) { list.hidden = false; empty.hidden = true; }
  } catch {}
})();`;

export default function OfflinePage() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-5 safe-top safe-bottom">
      <div className="w-full max-w-sm flex flex-col gap-5">
        <div className="flex items-center gap-2.5">
          <Logo className="size-9" />
          <span className="font-display font-semibold text-xl">Home Base</span>
        </div>
        <div className="card p-5 flex flex-col gap-3">
          <h1 className="font-display text-2xl font-semibold">No connection</h1>
          <p className="text-sm text-ink-2">This page needs the internet. Pages you opened recently on this device are still here:</p>
          <ul id="saved" hidden className="card divide-y divide-line overflow-hidden" />
          <p id="saved-empty" className="text-sm text-ink-3">
            Nothing saved yet. Open Preparedness while you are online and it will be here next time.
          </p>
        </div>
        <p className="text-sm text-ink-3">In an emergency, call 911 first. Saved pages show what you last saw; changes made elsewhere since then are not included.</p>
      </div>
      <script dangerouslySetInnerHTML={{ __html: listSaved }} />
    </main>
  );
}
