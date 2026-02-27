import { useState, useMemo } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, startOfDay, isSameDay, addMinutes, isBefore, isAfter, setHours, setMinutes } from "date-fns";
import { CalendarIcon, Clock, ChevronLeft, ChevronRight, MapPin, Video, CheckCircle2, Users } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function ClientBooking() {
  const { user } = useAuth();
  const clientId = useEffectiveClientId();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [step, setStep] = useState<"type" | "date" | "confirm">("type");
  const [bookingTab, setBookingTab] = useState<"individual" | "classes">("individual");

  // Get trainer ID
  const { data: trainerData } = useQuery({
    queryKey: ["client-trainer", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainer_clients")
        .select("trainer_id, profiles!trainer_clients_trainer_id_fkey(full_name)")
        .eq("client_id", clientId!)
        .eq("status", "active")
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const trainerId = trainerData?.trainer_id;

  // Fetch appointment types
  const { data: appointmentTypes } = useQuery({
    queryKey: ["client-appointment-types", trainerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointment_types")
        .select("*")
        .eq("trainer_id", trainerId!)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!trainerId,
  });

  // Fetch booking settings
  const { data: bookingSettings } = useQuery({
    queryKey: ["client-booking-settings", trainerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_settings")
        .select("*")
        .eq("trainer_id", trainerId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!trainerId,
  });

  // Fetch trainer availability for selected date's day of week
  const dayOfWeek = selectedDate.getDay();
  const { data: availability } = useQuery({
    queryKey: ["client-trainer-availability", trainerId, dayOfWeek],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainer_availability")
        .select("*")
        .eq("trainer_id", trainerId!)
        .eq("day_of_week", dayOfWeek);
      if (error) throw error;
      return data;
    },
    enabled: !!trainerId && step === "date",
  });

  // Fetch date overrides
  const { data: dateOverrides } = useQuery({
    queryKey: ["client-date-overrides", trainerId, format(selectedDate, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainer_date_overrides")
        .select("*")
        .eq("trainer_id", trainerId!)
        .eq("override_date", format(selectedDate, "yyyy-MM-dd"));
      if (error) throw error;
      return data;
    },
    enabled: !!trainerId && step === "date",
  });

  // Fetch vacations
  const { data: vacations } = useQuery({
    queryKey: ["client-trainer-vacations", trainerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainer_vacations")
        .select("*")
        .eq("trainer_id", trainerId!)
        .gte("end_date", format(new Date(), "yyyy-MM-dd"));
      if (error) throw error;
      return data;
    },
    enabled: !!trainerId,
  });

  // Fetch existing appointments for selected date
  const { data: existingAppointments } = useQuery({
    queryKey: ["client-existing-appointments", trainerId, format(selectedDate, "yyyy-MM-dd")],
    queryFn: async () => {
      const dayStart = startOfDay(selectedDate).toISOString();
      const dayEnd = startOfDay(addDays(selectedDate, 1)).toISOString();
      const { data, error } = await supabase
        .from("appointments")
        .select("start_time, end_time")
        .eq("trainer_id", trainerId!)
        .gte("start_time", dayStart)
        .lt("start_time", dayEnd)
        .in("status", ["confirmed"]);
      if (error) throw error;
      return data;
    },
    enabled: !!trainerId && step === "date",
  });

  // Fetch upcoming group class sessions
  const { data: classSessions } = useQuery({
    queryKey: ["client-class-sessions", trainerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_class_sessions")
        .select("*, group_class:group_classes(name, color, description, location, location_type, max_capacity), bookings:group_class_bookings(id, client_id, status)")
        .eq("trainer_id", trainerId!)
        .eq("is_cancelled", false)
        .gte("start_time", new Date().toISOString())
        .order("start_time");
      if (error) throw error;
      return data;
    },
    enabled: !!trainerId,
  });

  const selectedType = appointmentTypes?.find((t) => t.id === selectedTypeId);

  const isOnVacation = (date: Date) => {
    if (!vacations) return false;
    const dateStr = format(date, "yyyy-MM-dd");
    return vacations.some((v) => dateStr >= v.start_date && dateStr <= v.end_date);
  };

  // Generate available time slots
  const availableSlots = useMemo(() => {
    if (!selectedType || !availability || step !== "date") return [];
    if (isOnVacation(selectedDate)) return [];

    const duration = selectedType.duration_minutes;
    const buffer = bookingSettings?.buffer_minutes || 15;
    const slots: { start: Date; end: Date }[] = [];

    const timeBlocks = dateOverrides && dateOverrides.length > 0
      ? dateOverrides.filter((o) => !o.is_unavailable).map((o) => ({ start_time: o.start_time, end_time: o.end_time }))
      : (availability || []).filter((a) => a.is_general || a.appointment_type_id === selectedTypeId);

    for (const block of timeBlocks) {
      const [startH, startM] = block.start_time.split(":").map(Number);
      const [endH, endM] = block.end_time.split(":").map(Number);

      let slotStart = setMinutes(setHours(selectedDate, startH), startM);
      const blockEnd = setMinutes(setHours(selectedDate, endH), endM);

      while (addMinutes(slotStart, duration) <= blockEnd) {
        const slotEnd = addMinutes(slotStart, duration);

        const hasConflict = existingAppointments?.some((appt) => {
          const apptStart = new Date(appt.start_time);
          const apptEnd = addMinutes(new Date(appt.end_time), buffer);
          const bufferedSlotEnd = addMinutes(slotEnd, buffer);
          return isBefore(slotStart, apptEnd) && isAfter(bufferedSlotEnd, apptStart);
        });

        const minNotice = bookingSettings?.min_notice_hours || 24;
        const isPastNotice = isBefore(slotStart, addMinutes(new Date(), minNotice * 60));

        if (!hasConflict && !isPastNotice) {
          slots.push({ start: slotStart, end: slotEnd });
        }

        slotStart = addMinutes(slotStart, 30);
      }
    }

    return slots;
  }, [selectedType, availability, dateOverrides, existingAppointments, selectedDate, bookingSettings, step, selectedTypeId]);

  // Book 1-on-1 appointment
  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSlot || !trainerId || !clientId || !selectedTypeId) throw new Error("Missing data");
      const { error } = await supabase.from("appointments").insert({
        trainer_id: trainerId,
        client_id: clientId,
        appointment_type_id: selectedTypeId,
        start_time: selectedSlot.start.toISOString(),
        end_time: selectedSlot.end.toISOString(),
        status: "confirmed",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-existing-appointments"] });
      toast({ title: "Appointment booked!", description: `${selectedType?.name} on ${format(selectedSlot!.start, "EEE, MMM d 'at' h:mm a")}` });
      setStep("type");
      setSelectedSlot(null);
      setSelectedTypeId(null);
    },
    onError: () => {
      toast({ title: "Failed to book appointment", variant: "destructive" });
    },
  });

  // Book group class
  const bookClassMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      if (!clientId) throw new Error("Missing client ID");
      const { error } = await supabase.from("group_class_bookings").insert({
        session_id: sessionId,
        client_id: clientId,
        status: "confirmed",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-class-sessions"] });
      toast({ title: "Class booked!" });
    },
    onError: (err: any) => {
      if (err?.message?.includes("duplicate")) {
        toast({ title: "You're already signed up for this class", variant: "destructive" });
      } else {
        toast({ title: "Failed to book class", variant: "destructive" });
      }
    },
  });

  const bookingWindow = bookingSettings?.booking_window_days || 30;
  const dateOptions = Array.from({ length: Math.min(bookingWindow, 14) }, (_, i) => addDays(startOfDay(new Date()), i));

  const locationIcon = (type: string) => {
    if (type === "virtual") return <Video className="h-4 w-4" />;
    return <MapPin className="h-4 w-4" />;
  };

  return (
    <ClientLayout>
      <div className="p-6 space-y-6 max-w-2xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Book Session</h1>
          <p className="text-muted-foreground mt-1">
            Schedule with {(trainerData as any)?.profiles?.full_name || "your trainer"}
          </p>
        </div>

        <Tabs value={bookingTab} onValueChange={(v) => { setBookingTab(v as any); setStep("type"); setSelectedSlot(null); setSelectedTypeId(null); }}>
          <TabsList className="w-full">
            <TabsTrigger value="individual" className="flex-1">1-on-1 Sessions</TabsTrigger>
            <TabsTrigger value="classes" className="flex-1">Group Classes</TabsTrigger>
          </TabsList>

          {/* 1-on-1 Booking */}
          <TabsContent value="individual" className="space-y-4 mt-4">
            {/* Step 1: Select Type */}
            {step === "type" && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Select Session Type</h2>
                {appointmentTypes?.length === 0 && (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      No appointment types available for booking.
                    </CardContent>
                  </Card>
                )}
                {appointmentTypes?.map((type) => (
                  <Card
                    key={type.id}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => { setSelectedTypeId(type.id); setStep("date"); }}
                  >
                    <CardContent className="py-4 flex items-center gap-4">
                      <div className="w-1.5 h-12 rounded-full" style={{ backgroundColor: type.color || "#3b82f6" }} />
                      <div className="flex-1">
                        <p className="font-medium">{type.name}</p>
                        {type.description && <p className="text-sm text-muted-foreground">{type.description}</p>}
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{type.duration_minutes} min</span>
                          <span className="flex items-center gap-1">{locationIcon(type.location_type)}{type.location_type === "in_person" ? "In-Person" : type.location_type === "virtual" ? "Virtual" : "In-Person / Virtual"}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Step 2: Select Date & Time */}
            {step === "date" && selectedType && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setStep("type"); setSelectedSlot(null); }}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Badge style={{ backgroundColor: selectedType.color || "#3b82f6", color: "#fff" }}>
                    {selectedType.name} · {selectedType.duration_minutes}min
                  </Badge>
                </div>

                <h2 className="text-lg font-semibold">Select Date</h2>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {dateOptions.map((date) => {
                    const onVacation = isOnVacation(date);
                    return (
                      <button
                        key={date.toISOString()}
                        disabled={onVacation}
                        onClick={() => { setSelectedDate(date); setSelectedSlot(null); }}
                        className={`flex flex-col items-center min-w-[64px] py-3 px-2 rounded-lg border transition-colors ${
                          isSameDay(date, selectedDate)
                            ? "border-primary bg-primary/10 text-primary"
                            : onVacation
                            ? "border-border bg-muted text-muted-foreground opacity-50"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <span className="text-xs font-medium">{format(date, "EEE")}</span>
                        <span className="text-lg font-bold">{format(date, "d")}</span>
                        <span className="text-xs text-muted-foreground">{format(date, "MMM")}</span>
                      </button>
                    );
                  })}
                </div>

                <h2 className="text-lg font-semibold">Available Times</h2>
                {availableSlots.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No available slots on this date.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.start.toISOString()}
                        onClick={() => { setSelectedSlot(slot); setStep("confirm"); }}
                        className="py-3 px-2 rounded-lg border text-sm font-medium transition-colors hover:border-primary hover:bg-primary/10"
                      >
                        {format(slot.start, "h:mm a")}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Confirm */}
            {step === "confirm" && selectedType && selectedSlot && (
              <div className="space-y-4">
                <Button variant="ghost" size="sm" onClick={() => setStep("date")}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      Confirm Booking
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Session</span>
                        <span className="font-medium">{selectedType.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Date</span>
                        <span className="font-medium">{format(selectedSlot.start, "EEEE, MMMM d, yyyy")}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Time</span>
                        <span className="font-medium">{format(selectedSlot.start, "h:mm a")} – {format(selectedSlot.end, "h:mm a")}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Duration</span>
                        <span className="font-medium">{selectedType.duration_minutes} minutes</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Location</span>
                        <span className="font-medium flex items-center gap-1">
                          {locationIcon(selectedType.location_type)}
                          {selectedType.location_type === "in_person" ? "In-Person" : selectedType.location_type === "virtual" ? "Virtual" : "Flexible"}
                        </span>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      size="lg"
                      onClick={() => bookMutation.mutate()}
                      disabled={bookMutation.isPending}
                    >
                      {bookMutation.isPending ? "Booking..." : "Confirm Booking"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Group Classes */}
          <TabsContent value="classes" className="space-y-4 mt-4">
            <h2 className="text-lg font-semibold">Available Classes</h2>
            {(!classSessions || classSessions.length === 0) ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No upcoming classes available.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {classSessions.map((session) => {
                  const gc = (session as any).group_class;
                  const bookings = (session.bookings || []) as any[];
                  const confirmedCount = bookings.filter((b) => b.status === "confirmed").length;
                  const isFull = confirmedCount >= session.max_capacity;
                  const alreadyBooked = bookings.some((b) => b.client_id === clientId && b.status === "confirmed");

                  return (
                    <Card key={session.id} className={alreadyBooked ? "border-primary" : ""}>
                      <CardContent className="py-4">
                        <div className="flex items-start gap-3">
                          <div className="w-1.5 h-14 rounded-full" style={{ backgroundColor: gc?.color || "#8b5cf6" }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{gc?.name || "Class"}</p>
                              {alreadyBooked && <Badge className="text-xs">Signed Up</Badge>}
                            </div>
                            {gc?.description && <p className="text-sm text-muted-foreground mt-0.5">{gc.description}</p>}
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <CalendarIcon className="h-3 w-3" />
                                {format(new Date(session.start_time), "EEE, MMM d")}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(session.start_time), "h:mm a")} – {format(new Date(session.end_time), "h:mm a")}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {confirmedCount}/{session.max_capacity} spots
                              </span>
                              {gc?.location && (
                                <span className="flex items-center gap-1">
                                  {gc.location_type === "virtual" ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                                  {gc.location}
                                </span>
                              )}
                            </div>
                          </div>
                          <div>
                            {alreadyBooked ? (
                              <Badge variant="outline" className="text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Booked
                              </Badge>
                            ) : isFull ? (
                              <Badge variant="secondary" className="text-xs">Full</Badge>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => bookClassMutation.mutate(session.id)}
                                disabled={bookClassMutation.isPending}
                              >
                                Sign Up
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ClientLayout>
  );
}