import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  isSameMonth,
  isSameDay,
  startOfDay,
  parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight, CalendarIcon, Clock, User, Users } from "lucide-react";

type ViewMode = "month" | "week";

export function SchedulingCalendarTab() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const rangeStart = viewMode === "month"
    ? startOfWeek(startOfMonth(currentDate))
    : startOfWeek(currentDate);
  const rangeEnd = viewMode === "month"
    ? endOfWeek(endOfMonth(currentDate))
    : endOfWeek(currentDate);

  // Fetch appointments
  const { data: appointments } = useQuery({
    queryKey: ["calendar-appointments", user?.id, rangeStart.toISOString(), rangeEnd.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, appointment_type:appointment_types(name, color, duration_minutes), client:profiles!appointments_client_id_fkey(full_name)")
        .eq("trainer_id", user!.id)
        .gte("start_time", rangeStart.toISOString())
        .lte("start_time", rangeEnd.toISOString())
        .in("status", ["confirmed", "completed"]);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch group class sessions
  const { data: classSessions } = useQuery({
    queryKey: ["calendar-class-sessions", user?.id, rangeStart.toISOString(), rangeEnd.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_class_sessions")
        .select("*, group_class:group_classes(name, color, max_capacity), bookings:group_class_bookings(id, client_id, status)")
        .eq("trainer_id", user!.id)
        .gte("start_time", rangeStart.toISOString())
        .lte("start_time", rangeEnd.toISOString());
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Build events map by date
  const eventsByDate = useMemo(() => {
    const map: Record<string, Array<{ type: "appointment" | "class"; data: any }>> = {};
    const addEvent = (dateStr: string, event: { type: "appointment" | "class"; data: any }) => {
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(event);
    };
    appointments?.forEach((a) => addEvent(format(new Date(a.start_time), "yyyy-MM-dd"), { type: "appointment", data: a }));
    classSessions?.forEach((s) => addEvent(format(new Date(s.start_time), "yyyy-MM-dd"), { type: "class", data: s }));
    return map;
  }, [appointments, classSessions]);

  const navigate = (dir: "prev" | "next") => {
    if (viewMode === "month") {
      setCurrentDate(dir === "prev" ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    } else {
      setCurrentDate(dir === "prev" ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    }
  };

  // Generate calendar days
  const days: Date[] = [];
  let d = rangeStart;
  while (d <= rangeEnd) {
    days.push(d);
    d = addDays(d, 1);
  }

  const today = startOfDay(new Date());
  const selectedDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  const selectedEvents = selectedDateStr ? eventsByDate[selectedDateStr] || [] : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[180px] text-center">
            {viewMode === "month"
              ? format(currentDate, "MMMM yyyy")
              : `Week of ${format(rangeStart, "MMM d")} – ${format(rangeEnd, "MMM d, yyyy")}`}
          </h2>
          <Button variant="ghost" size="icon" onClick={() => navigate("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-1">
          <Button variant={viewMode === "month" ? "default" : "outline"} size="sm" onClick={() => setViewMode("month")}>
            Month
          </Button>
          <Button variant={viewMode === "week" ? "default" : "outline"} size="sm" onClick={() => setViewMode("week")}>
            Week
          </Button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="text-xs font-medium text-muted-foreground text-center py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const events = eventsByDate[dateStr] || [];
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, today);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const apptCount = events.filter((e) => e.type === "appointment").length;
          const classCount = events.filter((e) => e.type === "class").length;

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(day)}
              className={`bg-background p-2 min-h-[80px] text-left transition-colors hover:bg-accent/50 ${
                !isCurrentMonth && viewMode === "month" ? "opacity-40" : ""
              } ${isSelected ? "ring-2 ring-primary ring-inset" : ""}`}
            >
              <span
                className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full ${
                  isToday ? "bg-primary text-primary-foreground" : ""
                }`}
              >
                {format(day, "d")}
              </span>
              <div className="mt-1 space-y-0.5">
                {apptCount > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span className="text-[10px] text-muted-foreground truncate">
                      {apptCount} appt{apptCount > 1 ? "s" : ""}
                    </span>
                  </div>
                )}
                {classCount > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                    <span className="text-[10px] text-muted-foreground truncate">
                      {classCount} class{classCount > 1 ? "es" : ""}
                    </span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected date detail */}
      {selectedDate && (
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">
            {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </h3>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nothing scheduled</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents
                .sort((a, b) => new Date(a.data.start_time).getTime() - new Date(b.data.start_time).getTime())
                .map((event, i) => {
                  if (event.type === "appointment") {
                    const a = event.data;
                    return (
                      <Card key={`a-${i}`}>
                        <CardContent className="py-3 flex items-center gap-3">
                          <div className="w-1 h-10 rounded-full" style={{ backgroundColor: a.appointment_type?.color || "#3b82f6" }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm font-medium truncate">{a.appointment_type?.name || "Appointment"}</span>
                              <Badge variant="outline" className="text-xs">1-on-1</Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(a.start_time), "h:mm a")} – {format(new Date(a.end_time), "h:mm a")}
                              </span>
                              <span>{a.client?.full_name || "Client"}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  } else {
                    const s = event.data;
                    const confirmedCount = (s.bookings || []).filter((b: any) => b.status === "confirmed").length;
                    return (
                      <Card key={`c-${i}`}>
                        <CardContent className="py-3 flex items-center gap-3">
                          <div className="w-1 h-10 rounded-full" style={{ backgroundColor: s.group_class?.color || "#8b5cf6" }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm font-medium truncate">{s.group_class?.name || "Class"}</span>
                              <Badge variant="secondary" className="text-xs">Group</Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(s.start_time), "h:mm a")} – {format(new Date(s.end_time), "h:mm a")}
                              </span>
                              <span>{confirmedCount}/{s.max_capacity} booked</span>
                              {s.is_cancelled && <Badge variant="destructive" className="text-xs">Cancelled</Badge>}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
