import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, X, Volume2, Moon, Timer, Lock, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface Voice {
  id: string;
  voice_label: string;
  audio_url: string;
}

interface StoryData {
  id: string;
  name: string;
  subtitle?: string;
  description?: string;
  story_type: string;
  duration_seconds: number;
  is_premium?: boolean;
  ambient_sound_id?: string;
  ambient_blend_volume?: number;
  restore_story_voices?: Voice[];
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  story: StoryData;
  sounds: any[];
  isPremium?: boolean;
}

const TIMER_PRESETS = [15, 30, 45, 60];
const FREE_PREVIEW_SECONDS = 30;

export function SleepStoryPlayer({ open, onOpenChange, story, sounds, isPremium = false }: Props) {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(story.duration_seconds || 0);
  const [voiceLabel, setVoiceLabel] = useState("female");
  const [voiceVolume, setVoiceVolume] = useState(0.9);
  const [ambientVolume, setAmbientVolume] = useState(story.ambient_blend_volume || 0.3);
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null);
  const [previewExpired, setPreviewExpired] = useState(false);

  const isLocked = !isPremium && story.is_premium;

  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const voices = (story.restore_story_voices || []) as Voice[];
  const selectedVoice = voices.find((v) => v.voice_label === voiceLabel) || voices[0];
  const ambientSound = story.ambient_sound_id
    ? sounds.find((s: any) => s.id === story.ambient_sound_id)
    : null;

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      voiceAudioRef.current?.pause();
      ambientAudioRef.current?.pause();
      setIsPlaying(false);
    } else {
      voiceAudioRef.current?.play().catch(() => {});
      ambientAudioRef.current?.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [isPlaying]);

  // Track current time
  useEffect(() => {
    const audio = voiceAudioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onLoaded = () => setDuration(audio.duration || story.duration_seconds);
    const onEnded = () => {
      setIsPlaying(false);
      ambientAudioRef.current?.pause();
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
    };
  }, [selectedVoice, story.duration_seconds]);

  // Volumes
  useEffect(() => {
    if (voiceAudioRef.current) voiceAudioRef.current.volume = voiceVolume;
  }, [voiceVolume]);
  useEffect(() => {
    if (ambientAudioRef.current) ambientAudioRef.current.volume = ambientVolume;
  }, [ambientVolume]);

  // Sleep timer
  const startSleepTimer = (mins: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSleepTimer(mins);
    let rem = mins * 60;
    setTimerRemaining(rem);
    timerRef.current = setInterval(() => {
      rem -= 1;
      setTimerRemaining(rem);
      // Fade in last 60 seconds
      if (rem <= 60 && rem > 0) {
        const fraction = rem / 60;
        if (voiceAudioRef.current) voiceAudioRef.current.volume = voiceVolume * fraction;
        if (ambientAudioRef.current) ambientAudioRef.current.volume = ambientVolume * fraction;
      }
      if (rem <= 0) {
        voiceAudioRef.current?.pause();
        ambientAudioRef.current?.pause();
        setIsPlaying(false);
        setSleepTimer(null);
        setTimerRemaining(null);
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }, 1000);
  };

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      voiceAudioRef.current?.pause();
      ambientAudioRef.current?.pause();
      setIsPlaying(false);
      setCurrentTime(0);
      setPreviewExpired(false);
      if (voiceAudioRef.current) voiceAudioRef.current.currentTime = 0;
      if (timerRef.current) clearInterval(timerRef.current);
      setSleepTimer(null);
      setTimerRemaining(null);
    }
  }, [open]);

  // 30-second preview enforcement for locked stories
  useEffect(() => {
    if (!isLocked || !isPlaying) return;
    if (currentTime >= FREE_PREVIEW_SECONDS) {
      voiceAudioRef.current?.pause();
      ambientAudioRef.current?.pause();
      setIsPlaying(false);
      setPreviewExpired(true);
    }
  }, [currentTime, isLocked, isPlaying]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-[hsl(240,20%,6%)] border-white/10 text-white p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-2">
          <div>
            <h3 className="text-base font-bold">{story.name}</h3>
            {story.subtitle && <p className="text-xs text-white/40">{story.subtitle}</p>}
          </div>
          <Button variant="ghost" size="icon" className="text-white/40 hover:text-white" onClick={() => onOpenChange(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Visual */}
        <div className="flex flex-col items-center py-10 px-4">
          <div className={cn(
            "w-32 h-32 rounded-full flex items-center justify-center",
            "bg-gradient-to-br from-indigo-900/40 to-slate-900/40",
            "ring-1 ring-indigo-400/20",
            isPlaying && "animate-pulse"
          )}>
            <Moon className="h-12 w-12 text-indigo-400/60" />
          </div>

          {/* Time */}
          <div className="flex items-center gap-2 mt-6 text-sm text-white/40 font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>/</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* Progress */}
          <div className="w-full mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500/60 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {timerRemaining !== null && (
            <p className="text-[11px] text-white/30 mt-2">
              Sleep timer: {formatTime(timerRemaining)}
            </p>
          )}
        </div>

        {/* Premium preview expired banner */}
        {previewExpired && (
          <div className="mx-4 mb-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-400/20 text-center">
            <Lock className="h-5 w-5 text-amber-400/70 mx-auto mb-2" />
            <p className="text-xs text-white/70 mb-1">Preview ended</p>
            <p className="text-[10px] text-white/40 mb-3">Upgrade to listen to the full story</p>
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

        {/* Locked preview indicator */}
        {isLocked && !previewExpired && (
          <div className="mx-4 mb-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/5 border border-amber-400/10">
            <Lock className="h-3 w-3 text-amber-400/50 shrink-0" />
            <p className="text-[10px] text-white/40">30-second preview • Upgrade for full access</p>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 pb-4">
          <Button
            className="h-14 w-14 rounded-full bg-indigo-600 hover:bg-indigo-500"
            onClick={previewExpired ? undefined : togglePlay}
            disabled={previewExpired}
          >
            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
          </Button>
        </div>

        {/* Settings */}
        <div className="px-4 pb-4 space-y-3">
          {/* Voice selection */}
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
                        ? "bg-indigo-500/30 text-white"
                        : "bg-white/5 text-white/40"
                    )}
                    onClick={() => {
                      setVoiceLabel(v.voice_label);
                      if (isPlaying) {
                        voiceAudioRef.current?.pause();
                        setTimeout(() => voiceAudioRef.current?.play().catch(() => {}), 100);
                      }
                    }}
                  >
                    {v.voice_label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {voices.length > 0 && (
            <div className="flex items-center gap-2">
              <Volume2 className="h-3.5 w-3.5 text-white/30 w-4 shrink-0" />
              <span className="text-xs text-white/40 w-12">Voice</span>
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
              <Volume2 className="h-3.5 w-3.5 text-white/30 w-4 shrink-0" />
              <span className="text-xs text-white/40 w-12">Ambient</span>
              <Slider
                value={[ambientVolume * 100]}
                max={100}
                step={1}
                onValueChange={([v]) => setAmbientVolume(v / 100)}
                className="flex-1"
              />
            </div>
          )}

          {/* Sleep timer */}
          <div className="flex items-center gap-2">
            <Timer className="h-3.5 w-3.5 text-white/30 w-4 shrink-0" />
            <span className="text-xs text-white/40 w-12">Timer</span>
            <div className="flex gap-1 flex-1">
              {TIMER_PRESETS.map((m) => (
                <button
                  key={m}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs transition-colors",
                    sleepTimer === m
                      ? "bg-indigo-500/30 text-white"
                      : "bg-white/5 text-white/40"
                  )}
                  onClick={() => startSleepTimer(m)}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Hidden audio elements */}
        {selectedVoice && (
          <audio ref={voiceAudioRef} src={selectedVoice.audio_url} preload="auto" />
        )}
        {ambientSound && (
          <audio ref={ambientAudioRef} src={ambientSound.audio_url} loop preload="auto" />
        )}
      </DialogContent>
    </Dialog>
  );
}
