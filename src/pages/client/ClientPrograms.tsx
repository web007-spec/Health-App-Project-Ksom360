import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";

export default function ClientPrograms() {
  return (
    <ClientLayout>
      <div className="px-3 pt-4 pb-8 space-y-5 w-full">
        <h1 className="text-2xl font-bold">All Programs</h1>

        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-dashed">
            <CardContent className="py-8 flex flex-col items-center justify-center text-center gap-3">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Clock className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">
                Fasting protocols will appear here.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </ClientLayout>
  );
}
