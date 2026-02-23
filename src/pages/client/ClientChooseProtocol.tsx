import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProgramsSelector } from "@/components/ProgramsSelector";
import { QuickPlansSelector } from "@/components/QuickPlansSelector";
import { FastingSafetyNotice } from "@/components/FastingSafetyNotice";
import { FastingStructureComparison } from "@/components/FastingStructureComparison";
import { RecommendationCard } from "@/components/RecommendationCard";

export default function ClientChooseProtocol() {
  const navigate = useNavigate();

  return (
    <ClientLayout>
      <div className="px-3 pt-4 pb-8 space-y-6 w-full">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Choose Protocol</h1>
        </div>

        <RecommendationCard />
        <ProgramsSelector navigate={navigate} />
        <QuickPlansSelector navigate={navigate} />

        <FastingStructureComparison />
        <FastingSafetyNotice />
      </div>
    </ClientLayout>
  );
}
