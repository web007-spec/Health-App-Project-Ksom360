import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Swords, Trophy, ChevronDown, ChevronUp, User, Hash } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { format, parseISO } from "date-fns";

export default function ClientSportsProfile() {
  const clientId = useEffectiveClientId();

  const { data: profile } = useQuery({
    queryKey: ["profile", clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", clientId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const { data: sportProfiles } = useQuery({
    queryKey: ["client-sport-profiles", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_sport_profiles")
        .select("*")
        .eq("client_id", clientId);
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const { data: gameStats } = useQuery({
    queryKey: ["game-stat-entries", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("game_stat_entries" as any)
        .select("*")
        .eq("client_id", clientId)
        .order("game_date", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!clientId,
  });

  const sports = sportProfiles?.map(p => p.sport) || [];
  const defaultSport = sports.includes("softball") ? "softball" : sports[0] || "softball";

  return (
    <ClientLayout>
      <div className="p-4 space-y-4 pb-24">
        {/* Profile Header */}
        <ProfileHeader profile={profile} sportProfiles={sportProfiles} clientId={clientId} />

        {/* Sport Tabs */}
        {sports.length > 1 ? (
          <Tabs defaultValue={defaultSport}>
            <TabsList className="w-full">
            {sports.includes("softball") && <TabsTrigger value="softball" className="flex-1">🥎 Softball</TabsTrigger>}
              {sports.includes("basketball") && <TabsTrigger value="basketball" className="flex-1">🏀 Basketball</TabsTrigger>}
            </TabsList>
            {sports.includes("softball") && (
              <TabsContent value="softball">
                <BaseballStats gameStats={(gameStats || []).filter((g: any) => g.sport === "softball" || g.sport === "baseball" || !g.sport)} />
              </TabsContent>
            )}
            {sports.includes("basketball") && (
              <TabsContent value="basketball">
                <BasketballStats gameStats={(gameStats || []).filter((g: any) => g.sport === "basketball")} />
              </TabsContent>
            )}
          </Tabs>
        ) : (
          <>
            {defaultSport === "basketball" ? (
              <BasketballStats gameStats={(gameStats || []).filter((g: any) => g.sport === "basketball")} />
            ) : (
              <BaseballStats gameStats={(gameStats || []).filter((g: any) => g.sport === "softball" || g.sport === "baseball" || !g.sport)} />
            )}
          </>
        )}
      </div>
    </ClientLayout>
  );
}

function ProfileHeader({ profile, sportProfiles, clientId }: { profile: any; sportProfiles: any[] | undefined; clientId: string }) {
  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-r from-rose-500/20 to-sky-500/20 p-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-background shadow-lg">
            <AvatarImage src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${clientId}`} />
            <AvatarFallback>{(profile?.full_name || "?").substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-bold">{profile?.full_name || "Athlete"}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {sportProfiles?.map(sp => (
                <div key={sp.id} className="flex items-center gap-1">
                  {sp.position && (
                    <Badge variant="secondary" className="text-xs">
                      <User className="h-3 w-3 mr-1" />{sp.position}
                    </Badge>
                  )}
                  {sp.jersey_number && (
                    <Badge variant="secondary" className="text-xs">
                      <Hash className="h-3 w-3 mr-1" />{sp.jersey_number}
                    </Badge>
                  )}
                  {sp.team_name && <Badge variant="outline" className="text-xs">{sp.team_name}</Badge>}
                </div>
              ))}
            </div>
            {sportProfiles?.some(sp => sp.bats || sp.throws) && (
              <p className="text-xs text-muted-foreground mt-1">
                {sportProfiles.filter(sp => sp.sport === "baseball").map(sp => (
                  <span key={sp.id}>
                    {sp.bats && `Bats: ${sp.bats}`}
                    {sp.bats && sp.throws && " • "}
                    {sp.throws && `Throws: ${sp.throws}`}
                  </span>
                ))}
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ===== BASEBALL ===== */
function BaseballStats({ gameStats }: { gameStats: any[] }) {
  const totals = gameStats.reduce(
    (acc: any, g: any) => {
      acc.games++; acc.at_bats += g.at_bats || 0; acc.hits += g.hits || 0;
      acc.runs += g.runs || 0; acc.rbis += g.rbis || 0; acc.home_runs += g.home_runs || 0;
      acc.walks += g.walks || 0; acc.strikeouts += g.strikeouts || 0; acc.stolen_bases += g.stolen_bases || 0;
      acc.doubles += g.doubles || 0; acc.triples += g.triples || 0; acc.errors += g.errors || 0;
      if (g.result === "win") acc.wins++; if (g.result === "loss") acc.losses++;
      return acc;
    },
    { games: 0, at_bats: 0, hits: 0, runs: 0, rbis: 0, home_runs: 0, walks: 0, strikeouts: 0, stolen_bases: 0, doubles: 0, triples: 0, errors: 0, wins: 0, losses: 0 }
  );
  const battingAvg = totals.at_bats > 0 ? (totals.hits / totals.at_bats).toFixed(3) : ".000";
  const obp = totals.at_bats + totals.walks > 0 ? ((totals.hits + totals.walks) / (totals.at_bats + totals.walks)).toFixed(3) : ".000";
  const slg = totals.at_bats > 0 ? (((totals.hits - totals.doubles - totals.triples - totals.home_runs) + totals.doubles * 2 + totals.triples * 3 + totals.home_runs * 4) / totals.at_bats).toFixed(3) : ".000";

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" />Season Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3 text-center">
            <StatBox label="AVG" value={battingAvg} highlight />
            <StatBox label="OBP" value={obp} />
            <StatBox label="SLG" value={slg} />
            <StatBox label="G" value={String(totals.games)} />
          </div>
          <div className="grid grid-cols-4 gap-3 text-center mt-3">
            <StatBox label="H" value={String(totals.hits)} />
            <StatBox label="HR" value={String(totals.home_runs)} />
            <StatBox label="RBI" value={String(totals.rbis)} />
            <StatBox label="R" value={String(totals.runs)} />
          </div>
          <div className="grid grid-cols-4 gap-3 text-center mt-3">
            <StatBox label="2B" value={String(totals.doubles)} />
            <StatBox label="3B" value={String(totals.triples)} />
            <StatBox label="BB" value={String(totals.walks)} />
            <StatBox label="K" value={String(totals.strikeouts)} />
          </div>
          <div className="grid grid-cols-4 gap-3 text-center mt-3">
            <StatBox label="SB" value={String(totals.stolen_bases)} />
            <StatBox label="E" value={String(totals.errors)} />
            <StatBox label="W" value={String(totals.wins)} />
            <StatBox label="L" value={String(totals.losses)} />
          </div>
        </CardContent>
      </Card>
      <GameLogCard gameStats={gameStats} sport="baseball" />
    </div>
  );
}

/* ===== BASKETBALL ===== */
function BasketballStats({ gameStats }: { gameStats: any[] }) {
  const totals = gameStats.reduce(
    (acc: any, g: any) => {
      acc.games++; acc.points += g.points || 0; acc.rebounds += g.rebounds || 0;
      acc.assists += g.assists || 0; acc.steals += g.steals || 0; acc.blocks += g.blocks || 0;
      acc.turnovers += g.turnovers || 0; acc.fouls += g.fouls || 0; acc.minutes += g.minutes_played || 0;
      acc.fg_made += g.fg_made || 0; acc.fg_attempted += g.fg_attempted || 0;
      acc.three_made += g.three_pt_made || 0; acc.three_attempted += g.three_pt_attempted || 0;
      acc.ft_made += g.ft_made || 0; acc.ft_attempted += g.ft_attempted || 0;
      if (g.result === "win") acc.wins++; if (g.result === "loss") acc.losses++;
      return acc;
    },
    { games: 0, points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, fouls: 0, minutes: 0, fg_made: 0, fg_attempted: 0, three_made: 0, three_attempted: 0, ft_made: 0, ft_attempted: 0, wins: 0, losses: 0 }
  );
  const ppg = totals.games > 0 ? (totals.points / totals.games).toFixed(1) : "0.0";
  const rpg = totals.games > 0 ? (totals.rebounds / totals.games).toFixed(1) : "0.0";
  const apg = totals.games > 0 ? (totals.assists / totals.games).toFixed(1) : "0.0";
  const fgPct = totals.fg_attempted > 0 ? ((totals.fg_made / totals.fg_attempted) * 100).toFixed(1) : "0.0";
  const threePct = totals.three_attempted > 0 ? ((totals.three_made / totals.three_attempted) * 100).toFixed(1) : "0.0";
  const ftPct = totals.ft_attempted > 0 ? ((totals.ft_made / totals.ft_attempted) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" />Season Averages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3 text-center">
            <StatBox label="PPG" value={ppg} highlight />
            <StatBox label="RPG" value={rpg} />
            <StatBox label="APG" value={apg} />
            <StatBox label="G" value={String(totals.games)} />
          </div>
          <div className="grid grid-cols-4 gap-3 text-center mt-3">
            <StatBox label="FG%" value={`${fgPct}`} />
            <StatBox label="3P%" value={`${threePct}`} />
            <StatBox label="FT%" value={`${ftPct}`} />
            <StatBox label="MIN" value={String(totals.minutes)} />
          </div>
          <div className="grid grid-cols-4 gap-3 text-center mt-3">
            <StatBox label="STL" value={String(totals.steals)} />
            <StatBox label="BLK" value={String(totals.blocks)} />
            <StatBox label="TO" value={String(totals.turnovers)} />
            <StatBox label="PF" value={String(totals.fouls)} />
          </div>
          <div className="grid grid-cols-4 gap-3 text-center mt-3">
            <StatBox label="PTS" value={String(totals.points)} />
            <StatBox label="REB" value={String(totals.rebounds)} />
            <StatBox label="W" value={String(totals.wins)} />
            <StatBox label="L" value={String(totals.losses)} />
          </div>
        </CardContent>
      </Card>
      <GameLogCard gameStats={gameStats} sport="basketball" />
    </div>
  );
}

/* ===== SHARED COMPONENTS ===== */
function GameLogCard({ gameStats, sport }: { gameStats: any[]; sport: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Swords className="h-4 w-4 text-rose-500" />Game Log
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 p-3">
        {gameStats.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No game stats recorded yet.</p>
        ) : (
          gameStats.map((game: any) => (
            <GameLogEntry key={game.id} game={game} sport={sport} />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function GameLogEntry({ game, sport }: { game: any; sport: string }) {
  const [open, setOpen] = useState(false);
  const gameDate = game.game_date ? format(parseISO(game.game_date), "MMM d, yyyy") : "Unknown";
  const resultBadge = game.result === "win" ? "bg-emerald-500/10 text-emerald-600" :
    game.result === "loss" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground";

  const headline = sport === "basketball"
    ? `${game.points || 0} PTS`
    : (game.at_bats > 0 ? (game.hits / game.at_bats).toFixed(3) : ".000");
  const subline = sport === "basketball"
    ? `${game.rebounds || 0}r ${game.assists || 0}a`
    : `${game.hits || 0}/${game.at_bats || 0}`;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
          <div className="text-left">
            <p className="text-sm font-semibold">{gameDate}</p>
            <p className="text-xs text-muted-foreground">{game.opponent ? `vs ${game.opponent}` : "Game"}</p>
          </div>
          <div className="flex items-center gap-2">
            {game.result && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${resultBadge}`}>{game.result}</span>
            )}
            <span className="text-sm font-mono font-bold">{headline}</span>
            <span className="text-xs text-muted-foreground">{subline}</span>
            {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-3 pb-3">
          <div className="grid grid-cols-4 gap-2 text-center bg-muted/30 rounded-lg p-3">
            {sport === "basketball" ? (
              <>
                <MiniStat label="PTS" value={game.points} />
                <MiniStat label="REB" value={game.rebounds} />
                <MiniStat label="AST" value={game.assists} />
                <MiniStat label="STL" value={game.steals} />
                <MiniStat label="BLK" value={game.blocks} />
                <MiniStat label="TO" value={game.turnovers} />
                <MiniStat label="PF" value={game.fouls} />
                <MiniStat label="MIN" value={game.minutes_played} />
                <MiniStat label="FGM" value={game.fg_made} />
                <MiniStat label="FGA" value={game.fg_attempted} />
                <MiniStat label="3PM" value={game.three_pt_made} />
                <MiniStat label="3PA" value={game.three_pt_attempted} />
                <MiniStat label="FTM" value={game.ft_made} />
                <MiniStat label="FTA" value={game.ft_attempted} />
              </>
            ) : (
              <>
                <MiniStat label="AB" value={game.at_bats} />
                <MiniStat label="H" value={game.hits} />
                <MiniStat label="R" value={game.runs} />
                <MiniStat label="RBI" value={game.rbis} />
                <MiniStat label="1B" value={game.singles} />
                <MiniStat label="2B" value={game.doubles} />
                <MiniStat label="3B" value={game.triples} />
                <MiniStat label="HR" value={game.home_runs} />
                <MiniStat label="BB" value={game.walks} />
                <MiniStat label="K" value={game.strikeouts} />
                <MiniStat label="SB" value={game.stolen_bases} />
                <MiniStat label="E" value={game.errors} />
              </>
            )}
          </div>
          {game.notes && <p className="text-xs text-muted-foreground mt-2 italic">"{game.notes}"</p>}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function StatBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg py-2 ${highlight ? "bg-primary/10" : "bg-muted/50"}`}>
      <p className={`text-lg font-bold ${highlight ? "text-primary" : ""}`}>{value}</p>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase">{label}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-sm font-bold">{value || 0}</p>
      <p className="text-[9px] text-muted-foreground font-semibold uppercase">{label}</p>
    </div>
  );
}
