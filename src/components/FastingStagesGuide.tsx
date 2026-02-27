import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const FASTING_STAGES = [
  {
    hour: 0,
    label: "Anabolic",
    icon: "🔴",
    color: "#ef4444",
    summary: "Blood sugar rises after eating",
    benefits: [
      "Insulin is released to shuttle glucose into cells",
      "Body begins digesting and absorbing nutrients",
      "Energy from food is being stored as glycogen and fat",
    ],
  },
  {
    hour: 2,
    label: "Catabolic",
    icon: "🟠",
    color: "#f97316",
    summary: "Insulin drops, digestion slows",
    benefits: [
      "Insulin levels start declining",
      "Body shifts from storing to maintaining energy",
      "Digestive system starts resting",
    ],
  },
  {
    hour: 4,
    label: "Post-Absorptive",
    icon: "🟡",
    color: "#eab308",
    summary: "Blood sugar normalizes",
    benefits: [
      "Blood sugar returns to baseline levels",
      "Body begins tapping into glycogen reserves",
      "Growth hormone secretion begins to increase",
    ],
  },
  {
    hour: 8,
    label: "Gluconeogenesis",
    icon: "🟢",
    color: "#22c55e",
    summary: "Body creates glucose from non-carb sources",
    benefits: [
      "Liver converts amino acids and glycerol into glucose",
      "Glycogen stores are being depleted",
      "Metabolic flexibility improves as body adapts",
    ],
  },
  {
    hour: 12,
    label: "Metabolic Shift",
    icon: "🔵",
    color: "#3b82f6",
    summary: "Fat burning mode begins",
    benefits: [
      "Glycogen stores are significantly depleted",
      "Body switches primary fuel source to fat",
      "Ketone production begins at low levels",
      "Inflammation markers start to decrease",
    ],
  },
  {
    hour: 14,
    label: "Partial Ketosis",
    icon: "🟣",
    color: "#8b5cf6",
    summary: "Ketone bodies increase in the bloodstream",
    benefits: [
      "Brain begins using ketones for fuel",
      "Mental clarity and focus often improve",
      "Fat oxidation rate increases significantly",
    ],
  },
  {
    hour: 16,
    label: "Fat Burning Zone",
    icon: "🔥",
    color: "#f43f5e",
    summary: "Autophagy begins — cellular cleanup",
    benefits: [
      "Autophagy (cellular cleanup) is activated",
      "Damaged proteins and organelles are recycled",
      "Anti-aging pathways are stimulated",
      "Deep fat burning is in full effect",
    ],
  },
  {
    hour: 18,
    label: "Growth Hormone Surge",
    icon: "💪",
    color: "#ec4899",
    summary: "Human Growth Hormone surges",
    benefits: [
      "HGH levels can increase up to 5x baseline",
      "Muscle preservation is enhanced",
      "Fat metabolism is accelerated",
      "Tissue repair and recovery improve",
    ],
  },
  {
    hour: 24,
    label: "Autophagy Peak",
    icon: "♻️",
    color: "#06b6d4",
    summary: "Deep cellular renewal and detox",
    benefits: [
      "Autophagy reaches significant levels",
      "Intestinal stem cells begin regenerating",
      "Old immune cells are cleared out",
      "Inflammation is markedly reduced",
    ],
  },
  {
    hour: 36,
    label: "Deep Renewal",
    icon: "✨",
    color: "#14b8a6",
    summary: "Extended autophagy and gut healing",
    benefits: [
      "Gut lining repair and regeneration accelerates",
      "BDNF (brain-derived neurotrophic factor) increases",
      "Neuroplasticity and cognitive function are enhanced",
      "Cellular waste removal reaches peak efficiency",
    ],
  },
  {
    hour: 48,
    label: "Immune Reset",
    icon: "🛡️",
    color: "#a855f7",
    summary: "Immune system begins rebuilding",
    benefits: [
      "Old white blood cells are recycled",
      "Immune system begins generating fresh cells",
      "Stem cell-based regeneration is activated",
      "Significant reduction in oxidative stress",
    ],
  },
  {
    hour: 72,
    label: "Stem Cell Activation",
    icon: "🧬",
    color: "#6366f1",
    summary: "Full stem cell regeneration mode",
    benefits: [
      "Immune system is substantially renewed",
      "Stem cell production increases dramatically",
      "IGF-1 levels drop, promoting longevity pathways",
      "Complete metabolic reset is achieved",
    ],
  },
];

export function FastingStagesGuide() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-center gap-2 py-3 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
          <span>📖 Learn About Fasting Stages</span>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-3 pt-2 pb-1">
          {FASTING_STAGES.map((stage) => (
            <div
              key={stage.hour}
              className="rounded-xl border overflow-hidden"
              style={{ borderColor: `${stage.color}30` }}
            >
              {/* Header */}
              <div
                className="flex items-center gap-3 px-4 py-3"
                style={{ background: `${stage.color}12` }}
              >
                <span className="text-2xl">{stage.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold" style={{ color: stage.color }}>
                      {stage.label}
                    </h4>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${stage.color}20`,
                        color: stage.color,
                      }}
                    >
                      {stage.hour}h+
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{stage.summary}</p>
                </div>
              </div>
              {/* Benefits */}
              <div className="px-4 py-3 space-y-1.5">
                {stage.benefits.map((benefit, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: stage.color }}
                    />
                    <p className="text-xs text-muted-foreground leading-relaxed">{benefit}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button
            onClick={() => setIsOpen(false)}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            <span>📖 Close Fasting Stages</span>
            <ChevronUp className="h-4 w-4" />
          </button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
