import { useEffect } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidthClass?: string;
};

export default function Modal({ open, onClose, title, children, maxWidthClass = "max-w-2xl" }: ModalProps){
  useEffect(()=>{
    function onKey(e: KeyboardEvent){
      if(e.key === "Escape") onClose();
    }
    if(open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  },[open, onClose]);

  if(!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${maxWidthClass} rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl shadow-2xl animate-[fadeIn_200ms_ease-out]`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="text-white font-semibold">{title}</h3>
          <button onClick={onClose} className="px-2 py-1 rounded-md text-white/80 hover:text-white hover:bg-white/10">✕</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
      <style>{`@keyframes fadeIn{from{opacity:0; transform:translateY(6px)} to{opacity:1; transform:none}}`}</style>
    </div>
  );
}
