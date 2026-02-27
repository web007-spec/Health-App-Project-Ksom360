import { useState } from "react";
import { Search, X, ChevronUp, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface MessageSearchProps {
  onSearch: (query: string) => void;
  onClose: () => void;
  resultCount: number;
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
}

export function MessageSearch({ onSearch, onClose, resultCount, currentIndex, onNext, onPrev }: MessageSearchProps) {
  const [query, setQuery] = useState("");

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b bg-card/50">
      <Search className="h-4 w-4 text-muted-foreground shrink-0" />
      <Input
        placeholder="Search messages..."
        value={query}
        onChange={(e) => { setQuery(e.target.value); onSearch(e.target.value); }}
        className="h-8 text-sm"
        autoFocus
      />
      {resultCount > 0 && (
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {currentIndex + 1}/{resultCount}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onPrev}>
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onNext}>
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
