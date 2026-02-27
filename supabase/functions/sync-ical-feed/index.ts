import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple iCal parser
function parseICalEvents(icalText: string) {
  const events: Array<{
    uid: string;
    summary: string;
    description?: string;
    location?: string;
    dtstart?: string;
    dtend?: string;
    allDay: boolean;
  }> = [];

  const lines = icalText.replace(/\r\n /g, "").replace(/\r/g, "").split("\n");
  let inEvent = false;
  let current: Record<string, string> = {};

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      current = {};
    } else if (line === "END:VEVENT" && inEvent) {
      inEvent = false;
      if (current.UID && current.SUMMARY) {
        const allDay = !current.DTSTART?.includes("T");
        events.push({
          uid: current.UID,
          summary: current.SUMMARY,
          description: current.DESCRIPTION,
          location: current.LOCATION,
          dtstart: parseICalDate(current.DTSTART),
          dtend: parseICalDate(current.DTEND),
          allDay,
        });
      }
    } else if (inEvent) {
      // Handle properties with parameters like DTSTART;VALUE=DATE:20260215
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) continue;
      let key = line.substring(0, colonIdx);
      const value = line.substring(colonIdx + 1);
      // Strip parameters
      const semiIdx = key.indexOf(";");
      if (semiIdx !== -1) key = key.substring(0, semiIdx);
      current[key] = value;
    }
  }
  return events;
}

function parseICalDate(dateStr?: string): string | undefined {
  if (!dateStr) return undefined;
  // Format: 20260215T190000Z or 20260215
  const cleaned = dateStr.replace(/[^0-9TZ]/g, "");
  if (cleaned.length >= 8) {
    const y = cleaned.substring(0, 4);
    const m = cleaned.substring(4, 6);
    const d = cleaned.substring(6, 8);
    if (cleaned.includes("T") && cleaned.length >= 15) {
      const h = cleaned.substring(9, 11);
      const min = cleaned.substring(11, 13);
      const s = cleaned.substring(13, 15);
      const tz = cleaned.endsWith("Z") ? "Z" : "";
      return `${y}-${m}-${d}T${h}:${min}:${s}${tz}`;
    }
    return `${y}-${m}-${d}T00:00:00Z`;
  }
  return undefined;
}

// Detect event type from summary
function detectEventType(summary: string): string {
  const lower = summary.toLowerCase();
  if (lower.includes("game") || lower.includes("match") || lower.includes("tournament") || lower.includes(" vs ") || lower.includes(" vs.")) return "game";
  if (lower.includes("practice") || lower.includes("training") || lower.includes("drill")) return "practice";
  if (lower.includes("meeting") || lower.includes("team meeting")) return "meeting";
  return "event";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { feed_id } = await req.json();

    if (!feed_id) {
      return new Response(JSON.stringify({ error: "feed_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the feed
    const { data: feed, error: feedError } = await supabase
      .from("client_ical_feeds")
      .select("*")
      .eq("id", feed_id)
      .single();

    if (feedError || !feed) {
      return new Response(JSON.stringify({ error: "Feed not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify trainer owns this feed
    if (feed.trainer_id !== user.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the iCal feed
    let icalText: string;
    try {
      const feedResponse = await fetch(feed.feed_url);
      if (!feedResponse.ok) {
        throw new Error(`HTTP ${feedResponse.status}`);
      }
      icalText = await feedResponse.text();
    } catch (fetchErr: any) {
      // Update feed with error
      await supabase
        .from("client_ical_feeds")
        .update({ sync_error: `Failed to fetch: ${fetchErr.message}`, last_synced_at: new Date().toISOString() })
        .eq("id", feed_id);

      return new Response(JSON.stringify({ error: `Failed to fetch feed: ${fetchErr.message}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse events
    const events = parseICalEvents(icalText);

    // Upsert events
    const upsertData = events
      .filter((e) => e.dtstart)
      .map((e) => ({
        feed_id: feed_id,
        client_id: feed.client_id,
        event_uid: e.uid,
        event_type: detectEventType(e.summary),
        title: e.summary,
        description: e.description || null,
        location: e.location || null,
        start_time: e.dtstart!,
        end_time: e.dtend || null,
        all_day: e.allDay,
      }));

    if (upsertData.length > 0) {
      const { error: upsertError } = await supabase
        .from("sport_schedule_events")
        .upsert(upsertData, { onConflict: "feed_id,event_uid" });

      if (upsertError) {
        console.error("Upsert error:", upsertError);
        await supabase
          .from("client_ical_feeds")
          .update({ sync_error: upsertError.message, last_synced_at: new Date().toISOString() })
          .eq("id", feed_id);

        return new Response(JSON.stringify({ error: upsertError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Update last synced
    await supabase
      .from("client_ical_feeds")
      .update({ last_synced_at: new Date().toISOString(), sync_error: null })
      .eq("id", feed_id);

    return new Response(
      JSON.stringify({ success: true, events_synced: upsertData.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
