import { useEffect, useRef, useState, useMemo } from "react";
import { Maximize2, Minimize2, Volume2, VolumeX } from "lucide-react";
import { supabase, getUserOrWarn, toastError } from "../lib/supabase";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

// A more advanced Pomodoro timer. Users can configure focus and break
// durations, automatically cycle through intervals, and record focus
// sessions to the study_sessions table. Each focus period creates a
// new row with user_id, start_at and end_at; breaks are not recorded.
type Session = { id: string; start_at: string; end_at: string | null };

export default function Timer() {
  // Configurable durations (minutes)
  const [workMin, setWorkMin] = useState(25);
  const [shortMin, setShortMin] = useState(5);
  const [longMin, setLongMin] = useState(15);
  const [intervalsBeforeLong, setIntervalsBeforeLong] = useState(4);

  // Timer state
  const [phase, setPhase] = useState<'idle' | 'focus' | 'short' | 'long'>('idle');
  const [remaining, setRemaining] = useState(0); // seconds
  const [intervalCount, setIntervalCount] = useState(0);
  const [running, setRunning] = useState(false);

  // History of recent focus sessions
  const [history, setHistory] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const timerRef = useRef<any>(null);
  const focusStartRef = useRef<Date | null>(null);

  // Fullscreen state – helps reflect whether the document is currently fullscreen.
  const [fullscreen, setFullscreen] = useState(false);

  // Toggle for sound notifications. When enabled, a short beep will
  // play whenever a phase ends. This uses the Web Audio API and does
  // not require any external audio files. Users can disable sound if
  // they prefer silent transitions.
  const [soundOn, setSoundOn] = useState(true);
  
  // Ambient sound state for continuous background audio during focus
  const [ambientOn, setAmbientOn] = useState(false);
  const ambientRef = useRef<HTMLAudioElement | null>(null);

  /**
   * Play a short beep tone using the Web Audio API. The oscillator
   * frequency and duration are tuned to a pleasant notification sound.
   */
  function playBeep() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 880; // A5
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.start();
      // Ramp down quickly to avoid clicking
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      oscillator.stop(ctx.currentTime + 0.5);
    } catch {
      // ignore errors silently (e.g. user gesture not yet granted)
    }
  }

  // Keyboard shortcuts: F = fullscreen, Space = start/pause, N = next
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Only handle if not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        toggle();
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        if (running) handlePhaseEnd();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [running, phase]);

  // Listen for fullscreen changes to update local state. This ensures the
  // button label stays in sync if the user exits fullscreen via ESC.
  useEffect(() => {
    function onFsChange() {
      setFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);
  
  // Ambient sound effect: play continuous background audio during focus
  useEffect(() => {
    if (ambientOn && phase === 'focus' && running) {
      // Create simple ambient sound using Web Audio API
      if (!ambientRef.current) {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = 220; // A3 - soothing low frequency
        gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.start();
        // Store reference to stop later
        (ambientRef as any).current = { oscillator, ctx, gainNode };
      }
    } else {
      // Stop ambient sound
      if (ambientRef.current && (ambientRef.current as any).oscillator) {
        try {
          (ambientRef.current as any).oscillator.stop();
          (ambientRef.current as any).ctx.close();
        } catch (e) {}
        ambientRef.current = null;
      }
    }
    return () => {
      if (ambientRef.current && (ambientRef.current as any).oscillator) {
        try {
          (ambientRef.current as any).oscillator.stop();
          (ambientRef.current as any).ctx.close();
        } catch (e) {}
        ambientRef.current = null;
      }
    };
  }, [ambientOn, phase, running]);

  // Toggle fullscreen on the entire document. When entering fullscreen the
  // controls and timer remain visible but other browser chrome is hidden,
  // creating a distraction‑free focus mode. Exiting returns to normal.
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  // Load past sessions on mount
  useEffect(() => {
    (async () => {
      const user = await getUserOrWarn(); if (!user) { setLoading(false); return; }
      const { data } = await supabase.from('study_sessions').select('id, start_at, end_at').eq('user_id', user.id).order('start_at', { ascending: false }).limit(10);
      setHistory((data || []) as any as Session[]);
      setLoading(false);
    })();
  }, []);

  // Timer tick effect
  useEffect(() => {
    if (!running) return;
    timerRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          handlePhaseEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running, phase]);

  // Handle end of a phase and transition to the next
  async function handlePhaseEnd() {
    // Record focus session when a focus period ends
    if (phase === 'focus' && focusStartRef.current) {
      const user = await getUserOrWarn(); if (user) {
        const endAt = new Date();
        const { error } = await supabase.from('study_sessions').insert({ user_id: user.id, start_at: focusStartRef.current.toISOString(), end_at: endAt.toISOString() });
        if (error) toastError(error);
        // prepend new session to history
        setHistory(h => [{ id: String(Date.now()), start_at: focusStartRef.current!.toISOString(), end_at: endAt.toISOString() }, ...h].slice(0, 10));
      }
      focusStartRef.current = null;
    }
    setRunning(false);
    // If sound is enabled, play a notification beep
    if (soundOn) playBeep();
    // Determine next phase
    if (phase === 'focus') {
      const nextInterval = intervalCount + 1;
      setIntervalCount(nextInterval);
      if (nextInterval % intervalsBeforeLong === 0) {
        setPhase('long');
        setRemaining(longMin * 60);
      } else {
        setPhase('short');
        setRemaining(shortMin * 60);
      }
    } else if (phase === 'short' || phase === 'long') {
      setPhase('focus');
      setRemaining(workMin * 60);
    } else {
      setPhase('idle');
      setRemaining(0);
    }
    // Automatically start the next phase after a 1 second delay
    setTimeout(() => {
      if (phase !== 'idle') startPhase();
    }, 1000);
  }

  // Start the current phase timer
  function startPhase() {
    if (phase === 'idle') {
      setPhase('focus');
      setRemaining(workMin * 60);
      focusStartRef.current = new Date();
    } else if (phase === 'focus') {
      focusStartRef.current = new Date();
    }
    setRunning(true);
  }

  // Start/pause functionality
  function toggle() {
    if (running) {
      // Pause timer
      setRunning(false);
    } else {
      // Resume timer or start new cycle
      if (phase === 'idle') {
        setIntervalCount(0);
        setPhase('focus');
        setRemaining(workMin * 60);
        focusStartRef.current = new Date();
      } else if (phase === 'focus') {
        focusStartRef.current = new Date();
      }
      setRunning(true);
    }
  }

  function reset() {
    setRunning(false);
    setPhase('idle');
    setRemaining(0);
    setIntervalCount(0);
    focusStartRef.current = null;
  }

  // Format seconds to HH:MM:SS
  function fmt(secs: number) {
    const s = secs % 60;
    const m = Math.floor(secs / 60) % 60;
    const h = Math.floor(secs / 3600);
    return `${h > 0 ? String(h).padStart(2,'0') + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2,'0')}`;
  }

  // Count how many focus sessions were completed today. A session is
  // considered completed if its end_at falls on the same calendar
  // date as the user's local date. This is used to fill space at
  // the bottom of the timer when in fullscreen mode.
  const todayCount = useMemo(() => {
    const today = new Date();
    // Normalize to date string for comparison (yyyy-mm-dd)
    const todayStr = today.toISOString().split('T')[0];
    return history.filter(sess => {
      if (!sess.end_at) return false;
      return sess.end_at.split('T')[0] === todayStr;
    }).length;
  }, [history]);

  return (
    <Card className={
      // When entering fullscreen, expand the timer card to fill the
      // entire viewport. Otherwise use a reasonable minimum height.
      `p-4 relative flex flex-col ${fullscreen ? 'min-h-screen' : 'min-h-[65vh]'}`
    }>
      {/* Header with controls: sound and fullscreen toggles */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-bold">Pomodoro Timer</h2>
        <div className="flex gap-2">
          {/* Ambient sound toggle */}
          <button
            type="button"
            onClick={() => setAmbientOn(!ambientOn)}
            className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20"
            title="Ambient background sound during focus"
          >
            {ambientOn ? "🎵" : "🔇"}
            <span className="hidden sm:inline">{ambientOn ? "Ambient" : "Silent"}</span>
          </button>
          {/* Sound toggle */}
          <button
            type="button"
            onClick={() => setSoundOn(!soundOn)}
            className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20"
            title="Sound notifications"
          >
            {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
            <span className="hidden sm:inline">{soundOn ? "Beep" : "Muted"}</span>
          </button>
          {/* Fullscreen toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20"
            title="Fullscreen (F)"
          >
            {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span className="hidden sm:inline">{fullscreen ? "Exit" : "Fullscreen"}</span>
          </button>
        </div>
      </div>
      {/* Content wrapper fills available space */}
      <div className="flex-1 overflow-y-auto">
      {/* Config inputs */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div>
          <label className="text-sm text-white/80">Focus (min)</label>
          <Input type="number" min="1" max="120" value={workMin} onChange={e => setWorkMin(parseInt(e.target.value) || 1)} />
        </div>
        <div>
          <label className="text-sm text-white/80">Short break (min)</label>
          <Input type="number" min="1" max="60" value={shortMin} onChange={e => setShortMin(parseInt(e.target.value) || 1)} />
        </div>
        <div>
          <label className="text-sm text-white/80">Long break (min)</label>
          <Input type="number" min="1" max="60" value={longMin} onChange={e => setLongMin(parseInt(e.target.value) || 1)} />
        </div>
        <div>
          <label className="text-sm text-white/80">Intervals before long break</label>
          <Input type="number" min="1" max="10" value={intervalsBeforeLong} onChange={e => setIntervalsBeforeLong(parseInt(e.target.value) || 1)} />
        </div>
      </div>
      {/* Timer display with circular progress */}
      <div className="mb-4 flex flex-col items-center justify-center gap-4 rounded-xl border border-white/15 bg-white/10 p-6 text-center">
        <div className="text-sm uppercase text-white/70">{phase === 'idle' ? 'Ready' : phase === 'focus' ? 'Focus' : phase === 'short' ? 'Short Break' : 'Long Break'}</div>
        
        {/* Circular progress ring */}
        <div className="relative">
          <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 200 200">
            {/* Background circle */}
            <circle
              cx="100"
              cy="100"
              r="90"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="8"
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx="100"
              cy="100"
              r="90"
              stroke={phase === 'focus' ? '#06B6D4' : '#22D3EE'}
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 90}`}
              strokeDashoffset={`${2 * Math.PI * 90 * (1 - (phase !== 'idle' ? remaining / (phase === 'focus' ? workMin * 60 : phase === 'short' ? shortMin * 60 : longMin * 60) : 0))}`}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          {/* Time display centered */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-5xl font-bold text-white/90 tabular-nums">{fmt(remaining)}</div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={toggle}>{running ? 'Pause (Space)' : phase === 'idle' ? 'Start (Space)' : 'Resume (Space)'}</Button>
          <Button variant="outline" onClick={reset}>Reset</Button>
          {running && <Button variant="ghost" onClick={handlePhaseEnd}>Next (N)</Button>}
        </div>
      </div>
      {/* History */}
      <h3 className="mt-4 mb-2 text-lg font-semibold">Recent focus sessions</h3>
      {loading ? <div>Loading…</div> : history.length === 0 ? <div>No sessions recorded yet.</div> : (
        <ul className="space-y-2">
          {history.map(sess => (
            <li key={sess.id} className="flex items-center justify-between rounded-lg border border-white/15 bg-white/10 p-2 text-white/90">
              <div>
                <div className="text-sm text-white/70">{new Date(sess.start_at).toLocaleDateString()}</div>
                <div className="text-[15px]">Start: {new Date(sess.start_at).toLocaleTimeString()}</div>
                {sess.end_at ? <div className="text-[15px]">End: {new Date(sess.end_at).toLocaleTimeString()}</div> : <div className="text-[15px] text-white/60">In progress</div>}
              </div>
              {sess.end_at ? <div className="font-semibold">{fmt((new Date(sess.end_at).getTime() - new Date(sess.start_at).getTime()) / 1000)}</div> : null}
            </li>
          ))}
        </ul>
      )}
      </div>
      {/* Stats strip at bottom */}
      <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
        <div className="rounded-lg bg-white/5 p-3 border border-white/10">
          <div className="text-white/60">Focus Today</div>
          <div className="text-xl font-bold text-primary">{todayCount}</div>
        </div>
        <div className="rounded-lg bg-white/5 p-3 border border-white/10">
          <div className="text-white/60">Next Break</div>
          <div className="text-xl font-bold text-white/90">
            {phase === 'idle' ? '—' : phase === 'focus' ? (intervalCount + 1) % intervalsBeforeLong === 0 ? 'Long' : 'Short' : '—'}
          </div>
        </div>
        <div className="rounded-lg bg-white/5 p-3 border border-white/10">
          <div className="text-white/60">Cycle</div>
          <div className="text-xl font-bold text-white/90">{phase === 'idle' ? '0/4' : `${(intervalCount % intervalsBeforeLong) + (phase === 'focus' ? 1 : 0)}/${intervalsBeforeLong}`}</div>
        </div>
      </div>
      {/* Keyboard shortcuts hint */}
      <div className="mt-3 text-center text-xs text-white/40">
        Shortcuts: F = Fullscreen • Space = Start/Pause • N = Next
      </div>
    </Card>
  );
}