import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ExerciseOptionSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: string[];
  placeholder: string;
  onAddCustom: (name: string) => void;
}

export function ExerciseOptionSelect({ value, onValueChange, options, placeholder, onAddCustom }: ExerciseOptionSelectProps) {
  const [customValue, setCustomValue] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleAdd = () => {
    if (!customValue.trim()) return;
    onAddCustom(customValue.trim());
    onValueChange(customValue.toLowerCase().trim());
    setCustomValue("");
    setPopoverOpen(false);
  };

  return (
    <div className="flex gap-1">
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt} className="capitalize">
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="icon" className="shrink-0">
            <Plus className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="end">
          <p className="text-xs text-muted-foreground mb-2">Add custom option</p>
          <div className="flex gap-1">
            <Input
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              placeholder="Enter name..."
              className="text-sm h-8"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
            />
            <Button type="button" size="sm" className="h-8" onClick={handleAdd}>Add</Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
