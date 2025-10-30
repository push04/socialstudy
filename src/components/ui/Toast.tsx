import { createContext, useContext, useState } from "react";

/**
 * A simple toast provider. Exposes a `push` method on context to show
 * notifications. Also installs `window.notify` so that non‑React code
 * can display toasts. Toasts automatically disappear after 3.4 seconds.
 */
type Toast = { id: number, text: string, variant?: "default"|"error" };
const Ctx = createContext<{ push: (t: Omit<Toast,"id">)=>void }>({ push: ()=>{} });

export function Toaster({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  function push(t: Omit<Toast,"id">){
    const id = Date.now();
    setItems(x=>[...x,{ id, ...t }]);
    setTimeout(()=>setItems(x=>x.filter(i=>i.id!==id)), 3400);
  }
  // Expose a global notify helper for convenience
  (window as any).notify = (text: string, variant?: "default"|"error") => push({ text, variant });
  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="fixed right-3 bottom-3 z-50 flex flex-col gap-2">
        {items.map(t=> (
          <div key={t.id} className={"rounded-xl border px-3 py-2 shadow-glass " + (t.variant==="error" ? "border-red-400 text-red-300 bg-red-900/30" : "border-white/15 bg-white/10 text-white")}>{t.text}</div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToaster(){ return useContext(Ctx); }