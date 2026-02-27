import { DashboardCardConfig } from "@/lib/dashboardCards";

interface TodayScreenPhonePreviewProps {
  cards: DashboardCardConfig[];
  clientName?: string;
  clientId?: string;
}

export function TodayScreenPhonePreview({ cards, clientName = "Client", clientId }: TodayScreenPhonePreviewProps) {
  // Use the live client dashboard via iframe, passing clientId so it works without impersonation
  const params = new URLSearchParams({ preview: "1" });
  if (clientId) params.set("previewClientId", clientId);
  const iframeSrc = `/client/dashboard?${params.toString()}`;

  return (
    <div className="sticky top-6">
      <p className="text-xs text-muted-foreground text-center mb-2 font-medium">Live Preview</p>
      <div className="mx-auto w-[300px] rounded-[2.5rem] border-[6px] border-foreground/80 bg-background shadow-2xl overflow-hidden">
        {/* Status bar */}
        <div className="flex items-center justify-between px-5 py-1.5 bg-foreground/5">
          <span className="text-[10px] font-semibold text-muted-foreground">9:41</span>
          <div className="flex items-center gap-1">
            <div className="w-3.5 h-2 rounded-sm border border-muted-foreground/50">
              <div className="w-2 h-full bg-muted-foreground/50 rounded-sm" />
            </div>
          </div>
        </div>

        {/* Live iframe */}
        <div className="relative w-[288px] h-[520px] overflow-hidden">
          <iframe
            src={iframeSrc}
            className="absolute top-0 left-0 border-0"
            style={{
              width: "390px",
              height: "844px",
              transform: "scale(0.738)",
              transformOrigin: "top left",
            }}
            title="Client Dashboard Preview"
          />
        </div>

        {/* Bottom home indicator */}
        <div className="h-4 bg-foreground/5 flex items-center justify-center">
          <div className="w-20 h-1 rounded-full bg-foreground/20" />
        </div>
      </div>
    </div>
  );
}
