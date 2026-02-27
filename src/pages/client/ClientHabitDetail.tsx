import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useAuth } from "@/hooks/useAuth";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Minus, Plus, Send, Camera, Flame, Trophy, MessageSquare, NotepadText } from "lucide-react";
import { format, addDays, subDays, isToday, eachDayOfInterval, startOfMonth, endOfMonth, parseISO, differenceInDays, isBefore, isAfter, isSameDay } from "date-fns";

export default function ClientHabitDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const clientId = useEffectiveClientId();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"habit" | "insight" | "comment">("habit");
  const [viewDate, setViewDate] = useState(new Date());
  const [viewMonth, setViewMonth] = useState(new Date());
  const [commentText, setCommentText] = useState("");
  const [manualInput, setManualInput] = useState("");

  // Fetch habit
  const { data: habit } = useQuery({
    queryKey: ["habit-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_habits")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  // Fetch completions for the viewed date
  const dateStr = format(viewDate, "yyyy-MM-dd");
  const { data: dayCompletions } = useQuery({
    queryKey: ["habit-day-completions", id, dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("habit_completions")
        .select("*")
        .eq("habit_id", id)
        .eq("completion_date", dateStr);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!id,
  });

  // Fetch ALL completions (always, for both habit tab count display and insight tab)
  const { data: allCompletions } = useQuery({
    queryKey: ["habit-all-completions", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("habit_completions")
        .select("*")
        .eq("habit_id", id)
        .order("completion_date", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!id,
  });

  // Fetch comments
  const { data: comments } = useQuery({
    queryKey: ["habit-comments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("habit_comments" as any)
        .select("*")
        .eq("habit_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!id,
  });

  // Add completion mutation
  const addCompletionMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("habit_completions")
        .insert({ habit_id: id!, client_id: clientId!, completion_date: dateStr });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habit-day-completions", id, dateStr] });
      queryClient.invalidateQueries({ queryKey: ["habit-all-completions", id] });
      queryClient.invalidateQueries({ queryKey: ["client-habit-completions-today"] });
    },
  });

  // Remove completion mutation
  const removeCompletionMutation = useMutation({
    mutationFn: async () => {
      const last = dayCompletions?.[dayCompletions.length - 1];
      if (!last) return;
      const { error } = await supabase
        .from("habit_completions")
        .delete()
        .eq("id", last.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habit-day-completions", id, dateStr] });
      queryClient.invalidateQueries({ queryKey: ["habit-all-completions", id] });
      queryClient.invalidateQueries({ queryKey: ["client-habit-completions-today"] });
    },
  });

  // Send comment mutation
  const sendCommentMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("habit_comments" as any)
        .insert({ habit_id: id, user_id: user?.id, content: commentText });
      if (error) throw error;
    },
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["habit-comments", id] });
    },
  });

  if (!habit) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </ClientLayout>
    );
  }

  const currentCount = dayCompletions?.length || 0;
  const goalValue = habit.goal_value || 1;
  const progressPercent = Math.min((currentCount / goalValue) * 100, 100);
  const icon = habit.icon_url?.startsWith("emoji:") ? habit.icon_url.replace("emoji:", "") : "🎯";
  const isWaterType = habit.goal_unit === "cups" || habit.goal_unit === "glasses";

  // SVG arc for progress ring
  const radius = 120;
  const strokeWidth = 14;
  const arcLength = (270 / 360) * 2 * Math.PI * radius;
  const filledLength = (progressPercent / 100) * arcLength;

  // Insight calculations
  const completionDates = new Set(allCompletions?.map((c: any) => c.completion_date) || []);
  const startDate = parseISO(habit.start_date);
  const endDate = habit.end_date ? parseISO(habit.end_date) : new Date();
  const today = new Date();
  const effectiveEnd = isBefore(endDate, today) ? endDate : today;
  const totalDays = Math.max(1, differenceInDays(effectiveEnd, startDate) + 1);

  // Count completions per date for daily average
  const completionCountByDate: Record<string, number> = {};
  allCompletions?.forEach((c: any) => {
    completionCountByDate[c.completion_date] = (completionCountByDate[c.completion_date] || 0) + 1;
  });
  const completedDays = Object.keys(completionCountByDate).length;
  const totalCompletionValue = Object.values(completionCountByDate).reduce((a, b) => a + b, 0);
  const dailyAvg = totalDays > 0 ? Math.round(totalCompletionValue / totalDays) : 0;

  // Streaks (a day counts as "completed" if completions >= goal)
  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;
  if (allCompletions && allCompletions.length > 0) {
    const allDays = eachDayOfInterval({ start: startDate, end: effectiveEnd });
    for (const day of allDays) {
      const ds = format(day, "yyyy-MM-dd");
      const count = completionCountByDate[ds] || 0;
      if (count >= goalValue) {
        tempStreak++;
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }
    currentStreak = tempStreak;
  }
  const daysCompletedPercent = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

  // Calendar
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = monthStart.getDay() === 0 ? 6 : monthStart.getDay() - 1;

  const tabs = [
    { key: "habit" as const, label: "Habit" },
    { key: "insight" as const, label: "Insight" },
    { key: "comment" as const, label: "Comment" },
  ];

  return (
    <ClientLayout>
      <div className="min-h-screen bg-muted/30">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-background border-b">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold flex-1 text-center">{habit.name}</h1>
          <div className="w-9" />
        </div>

        {/* Tab bar */}
        <div className="flex mx-4 mt-3 bg-muted rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === tab.key
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ========= HABIT TAB ========= */}
        {activeTab === "habit" && (
          <div className="px-4 py-4">
            {/* Date navigator */}
            <div className="flex items-center justify-between mb-6">
              <Button variant="ghost" size="icon" onClick={() => setViewDate(subDays(viewDate, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold">
                {isToday(viewDate) ? "Today" : format(viewDate, "MMM d, yyyy")}
              </span>
              <Button variant="ghost" size="icon" onClick={() => setViewDate(addDays(viewDate, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Circular progress */}
            <div className="flex flex-col items-center justify-center mb-8">
              <div className="relative w-64 h-64">
                <svg viewBox="0 0 280 280" className="w-full h-full -rotate-[135deg]">
                  <circle
                    cx="140" cy="140" r={radius}
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${arcLength} ${2 * Math.PI * radius - arcLength}`}
                    strokeLinecap="round"
                  />
                  {progressPercent > 0 && (
                    <circle
                      cx="140" cy="140" r={radius}
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth={strokeWidth}
                      strokeDasharray={`${filledLength} ${2 * Math.PI * radius - filledLength}`}
                      strokeLinecap="round"
                      className="transition-all duration-500"
                    />
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                {isWaterType ? (
                    <>
                      <span className="text-5xl font-bold">{currentCount}</span>
                      <span className="text-sm text-muted-foreground">of {goalValue} {habit.goal_unit}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-6xl mb-1">{icon}</span>
                      <span className="text-sm text-muted-foreground mt-1">{currentCount} of {goalValue} {habit.goal_unit}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Increment controls */}
            {isWaterType ? (
              <div className="bg-background rounded-2xl p-5 shadow-sm">
                <p className="text-sm text-center text-muted-foreground mb-4">Add water intake</p>
                <div className="grid grid-cols-5 gap-3 justify-items-center">
                  {Array.from({ length: goalValue }).map((_, i) => {
                    const isFilled = i < currentCount;
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          if (isFilled) {
                            removeCompletionMutation.mutate();
                          } else {
                            addCompletionMutation.mutate();
                          }
                        }}
                        className="w-14 h-14 rounded-xl flex items-center justify-center transition-all active:scale-95"
                        disabled={addCompletionMutation.isPending || removeCompletionMutation.isPending}
                      >
                        <svg width="32" height="32" viewBox="0 0 24 24" className="transition-all">
                          <path d="M12 2C12 2 5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13z" 
                            fill={isFilled ? "hsl(var(--primary))" : "hsl(var(--muted))"} 
                            stroke={isFilled ? "hsl(var(--primary))" : "hsl(var(--muted-foreground)/0.3)"}
                            strokeWidth="1"
                          />
                        </svg>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between px-8">
                  <Button
                    variant="default"
                    size="icon"
                    className="h-14 w-14 rounded-full"
                    onClick={() => removeCompletionMutation.mutate()}
                    disabled={currentCount === 0 || removeCompletionMutation.isPending}
                  >
                    <Minus className="h-6 w-6" />
                  </Button>
                  <div className="text-center">
                    <p className="text-5xl font-bold">{currentCount}</p>
                    <div className="h-0.5 w-full bg-primary/20 mt-2 mb-1 rounded-full" />
                    <p className="text-sm text-muted-foreground">of {goalValue} {habit.goal_unit}</p>
                  </div>
                  <Button
                    variant="default"
                    size="icon"
                    className="h-14 w-14 rounded-full"
                    onClick={() => addCompletionMutation.mutate()}
                    disabled={addCompletionMutation.isPending}
                  >
                    <Plus className="h-6 w-6" />
                  </Button>
                </div>
                {/* Manual input */}
                <div className="bg-background rounded-2xl p-4 shadow-sm">
                  <p className="text-sm text-muted-foreground mb-3 text-center">Or enter manually</p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      placeholder={`Enter ${habit.goal_unit || 'value'}...`}
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      className="flex-1 text-center text-lg"
                    />
                    <Button
                      disabled={!manualInput || Number(manualInput) <= 0 || addCompletionMutation.isPending}
                      onClick={() => {
                        const val = Number(manualInput);
                        if (val > 0) {
                          // Add 'val' completions
                          const promises = Array.from({ length: val }).map(() =>
                            supabase.from("habit_completions").insert({ habit_id: id!, client_id: clientId!, completion_date: dateStr })
                          );
                          Promise.all(promises).then(() => {
                            setManualInput("");
                            queryClient.invalidateQueries({ queryKey: ["habit-day-completions", id, dateStr] });
                            queryClient.invalidateQueries({ queryKey: ["habit-all-completions", id] });
                            queryClient.invalidateQueries({ queryKey: ["client-habit-completions-today"] });
                          });
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========= INSIGHT TAB ========= */}
        {activeTab === "insight" && (
          <div className="px-4 py-4 space-y-4">
            {/* Calendar */}
            <div className="bg-background rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <Button variant="ghost" size="icon" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-semibold">{format(viewMonth, "MMMM yyyy")}</span>
                <Button variant="ghost" size="icon" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {["MO", "TU", "WE", "TH", "FR", "SA", "SU"].map((d) => (
                  <div key={d} className="text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
                ))}
                {Array.from({ length: startDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {monthDays.map((day) => {
                  const ds = format(day, "yyyy-MM-dd");
                  const dayCount = completionCountByDate[ds] || 0;
                  const isGoalMet = dayCount >= goalValue;
                  const hasAny = dayCount > 0;
                  const isInRange = !isBefore(day, startDate) && !isAfter(day, effectiveEnd);
                  const isCurrentDay = isSameDay(day, today);
                  return (
                    <div
                      key={ds}
                      className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-xs transition-colors ${
                        isGoalMet
                          ? "bg-primary text-primary-foreground font-bold"
                          : hasAny
                          ? "bg-primary/30 text-foreground font-medium"
                          : isCurrentDay
                          ? "ring-2 ring-primary text-foreground"
                          : isInRange
                          ? "text-foreground"
                          : "text-muted-foreground/40"
                      }`}
                    >
                      {format(day, "d")}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background rounded-2xl p-4 text-center shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Current Streak</p>
                <div className="flex items-center justify-center gap-1 mt-2">
                  <Flame className="h-5 w-5 text-destructive" />
                  <span className="text-3xl font-bold">{currentStreak}</span>
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
              </div>
              <div className="bg-background rounded-2xl p-4 text-center shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Daily Average</p>
                <div className="flex items-baseline justify-center gap-0.5 mt-2">
                  <span className="text-3xl font-bold">{dailyAvg}</span>
                  <span className="text-sm text-muted-foreground">/{goalValue}</span>
                </div>
              </div>
              <div className="bg-background rounded-2xl p-4 text-center shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Best Streak</p>
                <div className="flex items-center justify-center gap-1 mt-2">
                  <Trophy className="h-5 w-5 text-accent" />
                  <span className="text-3xl font-bold">{bestStreak}</span>
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
              </div>
              <div className="bg-background rounded-2xl p-4 text-center shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Days Completed</p>
                <div className="flex items-baseline justify-center gap-0.5 mt-2">
                  <span className="text-3xl font-bold">{daysCompletedPercent}</span>
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            </div>

            {/* Notes section */}
            <div className="bg-background rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  All Notes ({allCompletions?.filter((c: any) => c.notes).length || 0})
                </p>
                <NotepadText className="h-4 w-4 text-muted-foreground" />
              </div>
              {allCompletions?.filter((c: any) => c.notes).length ? (
                <div className="space-y-2">
                  {allCompletions.filter((c: any) => c.notes).map((c: any) => (
                    <div key={c.id} className="text-sm border-l-2 border-primary pl-3 py-1">
                      <p className="text-muted-foreground text-[10px]">{format(parseISO(c.completion_date), "MMM d, yyyy")}</p>
                      <p>{c.notes}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">There is no note yet</p>
              )}
            </div>
          </div>
        )}

        {/* ========= COMMENT TAB ========= */}
        {activeTab === "comment" && (
          <div className="flex flex-col" style={{ height: "calc(100vh - 160px)" }}>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {!comments || comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="h-16 w-16 text-muted-foreground/20 mb-3" />
                  <p className="font-semibold text-lg">No comments yet</p>
                  <p className="text-sm text-muted-foreground">Or share a picture</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment: any) => {
                    const isMine = comment.user_id === user?.id;
                    return (
                      <div key={comment.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                          isMine ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}>
                          {comment.image_url && (
                            <img src={comment.image_url} alt="" className="rounded-lg mb-2 max-w-full" />
                          )}
                          {comment.content && <p className="text-sm">{comment.content}</p>}
                          <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {format(parseISO(comment.created_at), "h:mm a")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Comment input */}
            <div className="border-t bg-background px-4 py-3 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                {user?.email?.charAt(0).toUpperCase()}
              </div>
              <Input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Type message..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && commentText.trim()) {
                    e.preventDefault();
                    sendCommentMutation.mutate();
                  }
                }}
              />
              <Button variant="ghost" size="icon">
                <Camera className="h-5 w-5 text-muted-foreground" />
              </Button>
              <Button
                size="icon"
                className="rounded-full"
                disabled={!commentText.trim() || sendCommentMutation.isPending}
                onClick={() => sendCommentMutation.mutate()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
