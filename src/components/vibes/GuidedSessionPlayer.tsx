import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, X, Volume2, VolumeX, RotateCcw, Lock, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface BreathingPattern {
  inhale: number;
  hold: number;
  exhale: number;
}

interface Voice {
  id: string;
  voice_label: string;
  audio_url: string;
}

interface SessionData {
  id: string;
  name: string;
  subtitle?: string;
  description?: string;
  category: string;
  duration_seconds: number;
  is_premium?: boolean;
  breathing_pattern: BreathingPattern;
  ambient_sound_id?: string;
  restore_session_voices?: Voice[];
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  session: SessionData;
  sounds: any[];
  isPremium?: boolean;
  isFree?: boolean;
}

type BreathPhase = "inhale" | "hold" | "exhale" | "idle";

export function GuidedSessionPlayer({ open, onOpenChange, session, sounds, isPremium = false, isFree = false }: Props) {
  const navigate = useNavigate();
  const isLocked = !isPremium && !isFree && session.is_premium;

  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState<BreathPhase>("idle");
  const [phaseTime, setPhaseTime] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceLabel, setVoiceLabel] = useState("female");
  const [ambientVolume, setAmbientVolume] = useState(0.4);
  const [voiceVolume, setVoiceVolume] = useState(0.8);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);

  const bp = session.breathing_pattern || { inhale: 4, hold: 7, exhale: 8 };
  const cycleLength = bp.inhale + bp.hold + bp.exhale;
  const totalDuration = session.duration_seconds;
  const voices = (session.restore_session_voices || []) as Voice[];

  const selectedVoice = voices.find((v) => v.voice_label === voiceLabel) || voices[0];
  const ambientSound = session.ambient_sound_id
    ? sounds.find((s: any) => s.id === session.ambient_sound_id)
    : null;

  // Compute breathing phase from elapsed time
  const computePhase = useCallback(
    (t: number): { phase: BreathPhase; remaining: number } => {
      const pos = t % cycleLength;
      if (pos < bp.inhale) return { phase: "inhale", remaining: bp.inhale - pos };
      if (pos < bp.inhale + bp.hold) return { phase: "hold", remaining: bp.inhale + bp.hold - pos };
      return { phase: "exhale", remaining: cycleLength - pos };
    },
    [bp, cycleLength]
  );

  // Start / pause
  const togglePlay = useCallback(() => {
    if (isRunning) {
      setIsRunning(false);
      voiceAudioRef.current?.pause();
      ambientAudioRef.current?.pause();
    } else {
      setIsRunning(true);
      if (voiceEnabled && selectedVoice && voiceAudioRef.current) {
        voiceAudioRef.current.play().catch(() => {});
      }
      if (ambientSound && ambientAudioRef.current) {
        ambientAudioRef.current.play().catch(() => {});
      }
    }
  }, [isRunning, voiceEnabled, selectedVoice, ambientSound]);

  // Timer tick
  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= totalDuration) {
          setIsRunning(false);
          return totalDuration;
        }
        return next;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, totalDuration]);

  // Update breathing phase
  useEffect(() => {
    if (!isRunning) {
      setPhase("idle");
      return;
    }
    const { phase: p, remaining } = computePhase(elapsed);
    setPhase(p);
    setPhaseTime(remaining);
  }, [elapsed, isRunning, computePhase]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setElapsed(0);
      setIsRunning(false);
      setPhase("idle");
    }
    return () => {
      voiceAudioRef.current?.pause();
      ambientAudioRef.current?.pause();
    };
  }, [open]);

  // Ambient volume
  useEffect(() => {
    if (ambientAudioRef.current) ambientAudioRef.current.volume = ambientVolume;
  }, [ambientVolume]);

  // Voice volume
  useEffect(() => {
    if (voiceAudioRef.current) voiceAudioRef.current.volume = voiceVolume;
  }, [voiceVolume]);

  // Toggle voice on/off
  useEffect(() => {
    if (!voiceEnabled && voiceAudioRef.current) {
      voiceAudioRef.current.pause();
    } else if (voiceEnabled && isRunning && voiceAudioRef.current) {
      voiceAudioRef.current.play().catch(() => {});
    }
  }, [voiceEnabled, isRunning]);

  const reset = () => {
    setElapsed(0);
    setIsRunning(false);
    setPhase("idle");
    voiceAudioRef.current?.pause();
    if (voiceAudioRef.current) voiceAudioRef.current.currentTime = 0;
    ambientAudioRef.current?.pause();
    if (ambientAudioRef.current) ambientAudioRef.current.currentTime = 0;
  };

  const remaining = totalDuration - elapsed;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  // Visual breathing circle scale
  const getCircleScale = (): number => {
    if (phase === "idle") return 0.6;
    const pos = elapsed % cycleLength;
    if (phase === "inhale") {
      const progress = pos / bp.inhale;
      return 0.6 + 0.4 * progress;
    }
    if (phase === "hold") return 1.0;
    // exhale
    const exhaleStart = bp.inhale + bp.hold;
    const progress = (pos - exhaleStart) / bp.exhale;
    return 1.0 - 0.4 * progress;
  };

  const phaseLabel = phase === "idle" ? "Ready" : phase === "inhale" ? "Breathe In" : phase === "hold" ? "Hold" : "Breathe Out";
  const phaseColor = phase === "inhale" ? "text-sky-400" : phase === "hold" ? "text-amber-400" : phase === "exhale" ? "text-violet-400" : "text-white/50";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-[hsl(260,20%,6%)] border-white/10 text-white p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-2">
          <div>
            <h3 className="text-base font-bold">{session.name}</h3>
            {session.subtitle && <p className="text-xs text-white/40">{session.subtitle}</p>}
          </div>
          <Button variant="ghost" size="icon" className="text-white/40 hover:text-white" onClick={() => onOpenChange(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Breathing circle */}
        <div className="flex flex-col items-center justify-center py-8 px-4">
          <div className="relative w-48 h-48 flex items-center justify-center">
            <div
              className={cn(
                "absolute inset-0 rounded-full transition-transform duration-1000 ease-in-out",
                phase === "inhale" && "bg-sky-500/10 ring-2 ring-sky-400/30",
                phase === "hold" && "bg-amber-500/10 ring-2 ring-amber-400/30",
                phase === "exhale" && "bg-violet-500/10 ring-2 ring-violet-400/30",
                phase === "idle" && "bg-white/5 ring-1 ring-white/10"
              )}
              style={{ transform: `scale(${getCircleScale()})` }}
            />
            <div className="relative z-10 text-center">
              <p className={cn("text-lg font-bold transition-colors", phaseColor)}>{phaseLabel}</p>
              {phase !== "idle" && (
                <p className="text-3xl font-mono font-bold text-white/80 mt-1">{Math.ceil(phaseTime)}</p>
              )}
            </div>
          </div>

          {/* Timer */}
          <p className="text-sm text-white/30 mt-4 font-mono">
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")} remaining
          </p>

          {/* Progress bar */}
          <div className="w-full mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[hsl(260,60%,60%)] transition-all duration-1000"
              style={{ width: `${(elapsed / totalDuration) * 100}%` }}
            />
          </div>
        </div>

        {/* Premium lock overlay */}
        {isLocked && (
          <div className="mx-4 mb-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-400/20 text-center">
            <Lock className="h-5 w-5 text-amber-400/70 mx-auto mb-2" />
            <p className="text-xs text-white/70 mb-1">Premium Session</p>
            <p className="text-[10px] text-white/40 mb-3">Upgrade to access this guided session</p>
            <button
              onClick={() => {
                onOpenChange(false);
                navigate("/client/settings?tab=subscription");
              }}
              className="flex items-center gap-1.5 mx-auto px-4 py-2 rounded-full text-[11px] font-semibold bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500 transition-all"
            >
              <Crown className="h-3 w-3" />
              Upgrade to Premium
            </button>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 pb-4">
          <Button variant="ghost" size="icon" className="text-white/50 hover:text-white" onClick={reset} disabled={isLocked}>
            <RotateCcw className="h-5 w-5" />
          </Button>
          <Button
            className="h-14 w-14 rounded-full bg-[hsl(260,50%,50%)] hover:bg-[hsl(260,50%,60%)]"
            onClick={isLocked ? undefined : togglePlay}
            disabled={isLocked}
          >
            {isLocked ? <Lock className="h-6 w-6" /> : isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("text-white/50 hover:text-white", !voiceEnabled && "text-white/20")}
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            disabled={isLocked}
          >
            {voiceEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </Button>
        </div>

        {/* Voice & ambient controls */}
        <div className="px-4 pb-4 space-y-3">
          {voices.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40 w-16">Voice</span>
              <div className="flex gap-1">
                {voices.map((v) => (
                  <button
                    key={v.id}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs capitalize transition-colors",
                      voiceLabel === v.voice_label
                        ? "bg-[hsl(260,50%,50%)]/30 text-white"
                        : "bg-white/5 text-white/40"
                    )}
                    onClick={() => setVoiceLabel(v.voice_label)}
                  >
                    {v.voice_label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {voices.length > 0 && voiceEnabled && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40 w-16">Voice</span>
              <Slider
                value={[voiceVolume * 100]}
                max={100}
                step={1}
                onValueChange={([v]) => setVoiceVolume(v / 100)}
                className="flex-1"
              />
            </div>
          )}

          {ambientSound && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40 w-16">Ambient</span>
              <Slider
                value={[ambientVolume * 100]}
                max={100}
                step={1}
                onValueChange={([v]) => setAmbientVolume(v / 100)}
                className="flex-1"
              />
            </div>
          )}
        </div>

        {/* Hidden audio elements */}
        {selectedVoice && (
          <audio
            ref={voiceAudioRef}
            src={selectedVoice.audio_url}
            preload="auto"
          />
        )}
        {ambientSound && (
          <audio
            ref={ambientAudioRef}
            src={ambientSound.audio_url}
            loop
            preload="auto"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
