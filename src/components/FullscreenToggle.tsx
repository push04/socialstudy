import { useEffect, useState } from "react";

type Props = {
  targetId?: string;
  className?: string;
  compact?: boolean;
};

export default function FullscreenToggle({ targetId, className = "", compact = false }: Props){
  const [isFs, setIsFs] = useState<boolean>(!!document.fullscreenElement);

  useEffect(()=>{
    function handler(){ setIsFs(!!document.fullscreenElement); }
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  },[]);

  async function enter(){
    const el = targetId ? document.getElementById(targetId) : document.documentElement;
    if(!el) return;
    try{ await (el as any).requestFullscreen(); }catch{}
  }
  async function exit(){
    try{ await document.exitFullscreen(); }catch{}
  }

  return (
    <button
      onClick={isFs ? exit : enter}
      className={
        (compact ? "px-2 py-1 text-sm " : "px-3 py-2 ") +
        "rounded-md border border-white/20 text-white hover:bg-white/10 transition " + className
      }
      title={isFs ? "Exit fullscreen" : "Enter fullscreen"}
      aria-label={isFs ? "Exit fullscreen" : "Enter fullscreen"}
    >
      {isFs ? "⤢" : "⤢"} {compact ? "" : (isFs ? "Exit Fullscreen" : "Fullscreen")}
    </button>
  );
}
