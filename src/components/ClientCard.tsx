import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { MessageSquare, Calendar, TrendingUp } from "lucide-react";

interface ClientCardProps {
  name: string;
  avatar: string;
  program: string;
  progress: number;
  lastCheckIn: string;
  status: "active" | "paused" | "pending";
}

export function ClientCard({ name, avatar, program, progress, lastCheckIn, status }: ClientCardProps) {
  const statusColors = {
    active: "bg-success text-success-foreground",
    paused: "bg-muted text-muted-foreground",
    pending: "bg-accent text-accent-foreground",
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14">
            <AvatarImage src={avatar} />
            <AvatarFallback>{name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-semibold text-foreground truncate">{name}</h4>
                <p className="text-sm text-muted-foreground">{program}</p>
              </div>
              <Badge className={statusColors[status]} variant="secondary">
                {status}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium text-foreground">{progress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              
              <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                <Calendar className="h-3 w-3" />
                <span>Last check-in: {lastCheckIn}</span>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button size="sm" variant="outline" className="flex-1">
                <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                Message
              </Button>
              <Button size="sm" variant="outline" className="flex-1">
                <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                Progress
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
