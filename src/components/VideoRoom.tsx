import { useEffect, useRef, useState } from "react";

/**
 * A robust video room wrapper that uses Jitsi Meet. It preflights camera
 * and microphone permissions before attempting to embed the meeting. If
 * embedding is blocked (e.g. by a browser extension or content security
 * policy), the component automatically opens the meeting in a new tab and
 * closes itself. The parent component controls its open state via the
 * `open` prop and receives an `onClose` callback when the user dismisses
 * the meeting or when the embed cannot be loaded.
 */
type Props = {
  open: boolean;
  roomKey: string; // stable per group, used to derive the room name
  onClose: () => void;
};

// Cache the Jitsi script load promise to avoid injecting multiple times
let jitsiPromise: Promise<void> | null = null;
function ensureScript(){
  if (jitsiPromise) return jitsiPromise;
  jitsiPromise = new Promise<void>((resolve, reject)=>{
    // If the API already exists on the window, resolve immediately
    if ((window as any).JitsiMeetExternalAPI) return resolve();
    const s = document.createElement("script");
    s.src = "https://meet.jit.si/external_api.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Jitsi script"));
    document.body.appendChild(s);
  });
  return jitsiPromise;
}

// Preflight camera and microphone permissions. If the user denies, we
// gracefully report the error and do not attempt to embed the meeting.
async function preflightAV(): Promise<boolean>{
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio:true, video:true });
    stream.getTracks().forEach(t=> t.stop());
    return true;
  } catch {
    return false;
  }
}

export function VideoRoom({ open, roomKey, onClose }: Props){
  const [error, setError] = useState<string | null>(null);
  const meetRef = useRef<any>(null);
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{
    if (!open) return;
    setError(null);
    // Compose a deterministic room name per group key
    const room = `SocialStudy-${roomKey}`;
    let disposed = false;

    (async ()=>{
      const ok = await preflightAV();
      if (!ok) {
        setError("Camera/Mic permission needed. Please allow access and try again.");
        return;
      }
      try {
        await ensureScript();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const API = (window as any).JitsiMeetExternalAPI;
        // Configure Jitsi with an extended toolbar to unlock more features.
        // See https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe#interfaceconfigoverwrite for options.
        meetRef.current = new API("meet.jit.si", {
          roomName: room,
          parentNode: mountRef.current,
          width: "100%",
          height: 560,
          userInfo: { displayName: "You" },
          configOverwrite: {
            prejoinPageEnabled: true,
            disableDeepLinking: true,
            startWithAudioMuted: false,
            startWithVideoMuted: false
          },
          interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: [
              "microphone",
              "camera",
              "desktop",
              "closedcaptions",
              "fullscreen",
              "fodeviceselection",
              "hangup",
              "profile",
              "chat",
              "raisehand",
              "etherpad",
              "sharedvideo",
              "settings",
              "participants-pane",
              "tileview",
              "videoquality",
              "filmstrip",
              "mute-everyone",
              "download",
              "help"
            ]
          }
        });
        meetRef.current.addListener("readyToClose", () => onClose?.());
      } catch (e){
        console.error(e);
        if (!disposed) {
          // Opening a new tab allows users behind CSP/extension blockers to join
          setError("Embed blocked. Opening secure meeting in a new tab.");
          window.open(`https://meet.jit.si/${room}`, "_blank", "noopener");
          onClose?.();
        }
      }
    })();
    return ()=>{
      disposed = true;
      try { meetRef.current?.dispose?.(); } catch {}
      meetRef.current = null;
    };
  }, [open, roomKey, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-4xl rounded-xl border border-white/15 bg-white/5 p-3 shadow-xl">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[15px] font-semibold text-white">Video Room</div>
          <button className="rounded-lg px-3 py-1 text-white/80 hover:bg-white/10" onClick={onClose}>Close</button>
        </div>
        {error ? (
          <div className="rounded-lg border border-white/20 bg-black/30 p-3 text-white/80">{error}</div>
        ) : (
          <div
            ref={mountRef}
            className="h-[560px] w-full overflow-hidden rounded-lg bg-black"
          />
        )}
        <div className="mt-2 flex items-center justify-between text-xs text-white/60">
          <div>If the embed doesn’t load, we opened the room in a new tab.</div>
          <a
            href={`https://meet.jit.si/SocialStudy-${roomKey}`}
            target="_blank"
            rel="noopener"
            className="rounded px-2 py-1 hover:bg-white/10"
          >Open in new tab</a>
        </div>
      </div>
    </div>
  );
}

// Many pages import the video room as a default export. Although the
// component is primarily exported as a named function above, we also
// provide a default export here. This ensures both default and named
// imports work, avoiding build errors when the import style differs.
export default VideoRoom;