import { useEffect, useRef, useState } from "react";

type Item = { label: string; value: string };
type Props = {
  items: Item[];
  value: string | null;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
};

export default function Dropdown({ items, value, onChange, placeholder = "Select", className = "" }: Props){
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement|null>(null);

  useEffect(()=>{
    function onDoc(e: MouseEvent){
      if(ref.current && !ref.current.contains(e.target as any)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  },[]);

  const current = items.find(i => i.value === value);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={()=>setOpen(o=>!o)}
        className="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 text-left text-white flex items-center justify-between hover:bg-white/15 transition"
      >
        <span>{current ? current.label : <span className="text-white/60">{placeholder}</span>}</span>
        <span className="text-white/70">▾</span>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-white/15 bg-[rgba(14,18,28,0.9)] backdrop-blur-xl shadow-2xl overflow-hidden animate-[fadeIn_120ms_ease-out]">
          {items.length === 0 ? (
            <div className="px-3 py-2 text-sm text-white/60">No options</div>
          ) : items.map(it => (
            <button
              key={it.value}
              onClick={()=>{ onChange(it.value); setOpen(false); }}
              className={"w-full px-3 py-2 text-left hover:bg-white/10 " + (it.value === value ? "bg-white/10" : "")}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
      <style>{`@keyframes fadeIn{from{opacity:0; transform:translateY(4px)} to{opacity:1; transform:none}}`}</style>
    </div>
  );
}
