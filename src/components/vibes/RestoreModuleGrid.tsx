import { Wind, Music2, Moon, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRestoreProfile } from "@/hooks/useRestoreProfile";

export type RestoreModule = "breathing" | "soundlab" | "sleep";

interface ModuleDef {
  id: RestoreModule;
  label: string;
  icon: React.ElementType;
}

const MODULES: ModuleDef[] = [
  { id: "breathing", label: "Breathing", icon: Wind },
  { id: "soundlab", label: "Sound Lab", icon: Music2 },
  { id: "sleep", label: "Sleep", icon: Moon },
];

interface Props {
  onModuleSelect: (module: RestoreModule) => void;
}

export function RestoreModuleGrid({ onModuleSelect }: Props) {
  const { config } = useRestoreProfile();

  return (
    <div className="space-y-3">
      <h4 className="text-[10px] uppercase tracking-[0.2em] text-white/25 font-medium">
        Modules
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {MODULES.map((mod) => {
          const Icon = mod.icon;
          const desc = config.moduleMeta[mod.id];
          return (
            <button
              key={mod.id}
              onClick={() => onModuleSelect(mod.id)}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl transition-all duration-200",
                "bg-white/[0.03] border border-white/[0.06]",
                "hover:bg-white/[0.06] hover:border-white/[0.10]",
                "active:scale-[0.98] text-left"
              )}
            >
              <div
                className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor: `hsla(${config.accent}, 0.12)`,
                }}
              >
                <Icon
                  className="h-5 w-5"
                  style={{ color: `hsl(${config.accentGlow})` }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/85">{mod.label}</p>
                <p className="text-xs text-white/30 mt-0.5">{desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-white/20 shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
