import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Smile, Search, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const EMOJI_CATEGORIES = [
  { name: "Smileys", emojis: ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","😊","😇","🥰","😍","🤩","😘","😗","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🫡","🤐","🤨","😐","😑","😶","🫥","😏","😒","🙄","😬","😮‍💨","🤥","🫠","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🥵","🥶","🥴","😵","🤯","🤠","🥳","🥸","😎","🤓","🧐"] },
  { name: "Gestures", emojis: ["👋","🤚","🖐️","✋","🖖","🫱","🫲","🫳","🫴","👌","🤌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","🫵","👍","👎","✊","👊","🤛","🤜","👏","🙌","🫶","👐","🤲","🤝","🙏","💪","🦾","🦿","🦵","🦶","👂"] },
  { name: "Fitness", emojis: ["💪","🏋️","🏋️‍♂️","🏋️‍♀️","🤸","🤸‍♂️","🤸‍♀️","🧘","🧘‍♂️","🧘‍♀️","🏃","🏃‍♂️","🏃‍♀️","🚴","🚴‍♂️","🚴‍♀️","🏊","🏊‍♂️","🏊‍♀️","⛹️","⛹️‍♂️","⛹️‍♀️","🤾","🤾‍♂️","🤾‍♀️","🏆","🥇","🥈","🥉","🏅","🎯","🔥","⚡","💥","✨","🌟","⭐"] },
  { name: "Food", emojis: ["🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🥑","🥦","🥬","🥒","🌶️","🫑","🌽","🥕","🫒","🧄","🧅","🥔","🍠","🥐","🍞","🥖","🫓","🥨","🥯","🥞","🧇","🧀","🍖","🍗","🥩","🥓","🍔","🍟","🍕","🌭","🥪","🌮","🌯","🫔","🥙","🧆","🥚","🍳","🥘","🍲","🫕","🥣","🥗","🍿","🧈","🧂","🥫"] },
  { name: "Hearts", emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❤️‍🔥","❤️‍🩹","❣️","💕","💞","💓","💗","💖","💘","💝","💟","♥️","🫶","😍","🥰","😘","😻","💑","💏"] },
  { name: "Objects", emojis: ["⏰","⏱️","📱","💻","⌨️","🖥️","📸","📷","🎥","📹","📺","📻","🎵","🎶","🎤","🎧","🎼","🎹","🥁","🎸","🎻","🎺","🎷","💊","🩺","🩹","💉","🧬","🔬","🔭","📡","🏥","🏠","🏢","🏫","🏟️","🏗️"] },
];

interface GifResult {
  id: string;
  title: string;
  preview: string;
  url: string;
  width: number;
  height: number;
}

interface EmojiGifPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onSelectGif: (gifUrl: string) => void;
}

export function EmojiGifPicker({ onSelectEmoji, onSelectGif }: EmojiGifPickerProps) {
  const [open, setOpen] = useState(false);
  const [emojiSearch, setEmojiSearch] = useState("");
  const [gifSearch, setGifSearch] = useState("");
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [loadingGifs, setLoadingGifs] = useState(false);
  const [activeTab, setActiveTab] = useState("emoji");

  // Load trending GIFs on tab switch
  useEffect(() => {
    if (activeTab === "gif" && gifs.length === 0 && !loadingGifs) {
      searchGifs("");
    }
  }, [activeTab]);

  const searchGifs = useCallback(async (query: string) => {
    setLoadingGifs(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-gifs", {
        body: { query, limit: 24 },
      });
      if (error) throw error;
      setGifs(data.gifs || []);
    } catch (err) {
      console.error("GIF search error:", err);
    } finally {
      setLoadingGifs(false);
    }
  }, []);

  // Debounced GIF search
  useEffect(() => {
    if (activeTab !== "gif") return;
    const timer = setTimeout(() => {
      searchGifs(gifSearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [gifSearch, activeTab]);

  // Filter emojis by search
  const filteredCategories = emojiSearch.trim()
    ? EMOJI_CATEGORIES.map((cat) => ({
        ...cat,
        emojis: cat.emojis.filter(() => cat.name.toLowerCase().includes(emojiSearch.toLowerCase())),
      })).filter((cat) => cat.emojis.length > 0)
    : EMOJI_CATEGORIES;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="shrink-0 h-9 w-9">
          <Smile className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" side="top" align="start">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full rounded-none border-b bg-transparent h-10">
            <TabsTrigger value="emoji" className="flex-1 text-xs">😊 Emoji</TabsTrigger>
            <TabsTrigger value="gif" className="flex-1 text-xs">GIF</TabsTrigger>
          </TabsList>

          <TabsContent value="emoji" className="m-0">
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search category..."
                  value={emojiSearch}
                  onChange={(e) => setEmojiSearch(e.target.value)}
                  className="h-8 pl-8 text-sm"
                />
              </div>
            </div>
            <ScrollArea className="h-64">
              <div className="p-2 space-y-3">
                {filteredCategories.map((cat) => (
                  <div key={cat.name}>
                    <p className="text-xs font-semibold text-muted-foreground mb-1 px-1">{cat.name}</p>
                    <div className="flex flex-wrap gap-0.5">
                      {cat.emojis.map((emoji, i) => (
                        <button
                          key={`${emoji}-${i}`}
                          onClick={() => {
                            onSelectEmoji(emoji);
                            setOpen(false);
                          }}
                          className="text-xl hover:bg-muted rounded p-1 transition-colors hover:scale-110"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="gif" className="m-0">
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search GIFs..."
                  value={gifSearch}
                  onChange={(e) => setGifSearch(e.target.value)}
                  className="h-8 pl-8 text-sm"
                />
              </div>
            </div>
            <ScrollArea className="h-64">
              {loadingGifs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : gifs.length > 0 ? (
                <div className="grid grid-cols-2 gap-1 p-2">
                  {gifs.map((gif) => (
                    <button
                      key={gif.id}
                      onClick={() => {
                        onSelectGif(gif.url);
                        setOpen(false);
                      }}
                      className="rounded-md overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                    >
                      <img
                        src={gif.preview || gif.url}
                        alt={gif.title}
                        className="w-full h-24 object-cover"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8 text-sm">
                  {gifSearch ? "No GIFs found" : "Search for GIFs"}
                </div>
              )}
            </ScrollArea>
            <div className="border-t px-2 py-1">
              <p className="text-[9px] text-muted-foreground text-right">Powered by Tenor</p>
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
