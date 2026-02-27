import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UtensilsCrossed, Egg, Salad, ChefHat, Cookie, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BreakYourFastCardProps {
  hasFlexibleMealPlan: boolean;
}

export function BreakYourFastCard({ hasFlexibleMealPlan }: BreakYourFastCardProps) {
  const navigate = useNavigate();
  const [whyOpen, setWhyOpen] = useState(false);

  const handleMealAction = (mealType: string) => {
    if (hasFlexibleMealPlan) {
      navigate(`/client/coaching?mealType=${mealType}`);
    } else {
      navigate("/client/log-meal");
    }
  };

  return (
    <>
      <Card className="overflow-hidden border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                <UtensilsCrossed className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Break your fast</h3>
                <Badge variant="secondary" className="text-[10px] mt-0.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/10">
                  Protein first
                </Badge>
              </div>
            </div>
            <button
              onClick={() => setWhyOpen(true)}
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
            >
              <Info className="h-3 w-3" /> Why?
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            Start with protein + hydration. Keep carbs low.
          </p>

          <div className="grid grid-cols-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-col h-auto py-2.5 gap-1 text-xs"
              onClick={() => handleMealAction("breakfast")}
            >
              <Egg className="h-4 w-4 text-amber-500" />
              Breakfast
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-col h-auto py-2.5 gap-1 text-xs"
              onClick={() => handleMealAction("lunch")}
            >
              <Salad className="h-4 w-4 text-emerald-500" />
              Lunch
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-col h-auto py-2.5 gap-1 text-xs"
              onClick={() => handleMealAction("dinner")}
            >
              <ChefHat className="h-4 w-4 text-orange-500" />
              Dinner
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-col h-auto py-2.5 gap-1 text-xs"
              onClick={() => handleMealAction("snack")}
            >
              <Cookie className="h-4 w-4 text-primary" />
              Snack
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={whyOpen} onOpenChange={setWhyOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Why protein first?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Protein first reduces cravings and supports stable energy after fasting.
            It helps maintain muscle mass, keeps you fuller longer, and prevents
            blood sugar spikes that can lead to energy crashes.
          </p>
          <Button variant="outline" className="w-full" onClick={() => setWhyOpen(false)}>
            Got it
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
