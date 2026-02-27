import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Upload, X, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { compressImage } from "@/lib/imageCompression";

interface LogProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LogProgressDialog({ open, onOpenChange }: LogProgressDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [date, setDate] = useState<Date>(new Date());
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [measurements, setMeasurements] = useState({
    chest: "",
    waist: "",
    hips: "",
    arms: "",
    thighs: "",
  });
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);

  const logProgressMutation = useMutation({
    mutationFn: async () => {
      const measurementsObj: any = {};
      if (measurements.chest) measurementsObj.chest = parseFloat(measurements.chest);
      if (measurements.waist) measurementsObj.waist = parseFloat(measurements.waist);
      if (measurements.hips) measurementsObj.hips = parseFloat(measurements.hips);
      if (measurements.arms) measurementsObj.arms = parseFloat(measurements.arms);
      if (measurements.thighs) measurementsObj.thighs = parseFloat(measurements.thighs);

      // Upload photos if any
      let photoUrls: string[] = [];
      if (photos.length > 0) {
        const uploadPromises = photos.map(async (photo) => {
          const compressed = await compressImage(photo);
          const timestamp = Date.now();
          const fileName = `${user?.id}/${format(date, "yyyy-MM-dd")}_${timestamp}_${photo.name}`;
          
          const { error: uploadError } = await supabase.storage
            .from("progress-photos")
            .upload(fileName, compressed);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from("progress-photos")
            .getPublicUrl(fileName);

          return publicUrl;
        });

        photoUrls = await Promise.all(uploadPromises);
      }

      const { error } = await supabase.from("progress_entries").insert({
        client_id: user?.id,
        entry_date: format(date, "yyyy-MM-dd"),
        weight: weight ? parseFloat(weight) : null,
        body_fat_percentage: bodyFat ? parseFloat(bodyFat) : null,
        measurements: Object.keys(measurementsObj).length > 0 ? measurementsObj : null,
        notes: notes.trim() || null,
        photos: photoUrls.length > 0 ? photoUrls : null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress-entries"] });
      queryClient.invalidateQueries({ queryKey: ["progress-entries-recent"] });
      toast({
        title: "Success",
        description: "Progress logged successfully",
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to log progress",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setDate(new Date());
    setWeight("");
    setBodyFat("");
    setMeasurements({ chest: "", waist: "", hips: "", arms: "", thighs: "" });
    setNotes("");
    setPhotos([]);
    setPhotoPreviewUrls([]);
    onOpenChange(false);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + photos.length > 5) {
      toast({
        title: "Too many photos",
        description: "You can upload a maximum of 5 photos",
        variant: "destructive",
      });
      return;
    }

    setPhotos((prev) => [...prev, ...files]);
    
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviewUrls((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight && !bodyFat && !Object.values(measurements).some((v) => v)) {
      toast({
        title: "Error",
        description: "Please enter at least one measurement",
        variant: "destructive",
      });
      return;
    }
    logProgressMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Progress</DialogTitle>
          <DialogDescription>Record your body measurements and track your progress</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus className="pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          {/* Weight & Body Fat */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                placeholder="75.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bodyFat">Body Fat %</Label>
              <Input
                id="bodyFat"
                type="number"
                step="0.1"
                placeholder="18.5"
                value={bodyFat}
                onChange={(e) => setBodyFat(e.target.value)}
              />
            </div>
          </div>

          {/* Measurements */}
          <div className="space-y-3">
            <Label>Body Measurements (cm)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="chest" className="text-sm text-muted-foreground">
                  Chest
                </Label>
                <Input
                  id="chest"
                  type="number"
                  step="0.1"
                  placeholder="100"
                  value={measurements.chest}
                  onChange={(e) =>
                    setMeasurements((prev) => ({ ...prev, chest: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="waist" className="text-sm text-muted-foreground">
                  Waist
                </Label>
                <Input
                  id="waist"
                  type="number"
                  step="0.1"
                  placeholder="80"
                  value={measurements.waist}
                  onChange={(e) =>
                    setMeasurements((prev) => ({ ...prev, waist: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hips" className="text-sm text-muted-foreground">
                  Hips
                </Label>
                <Input
                  id="hips"
                  type="number"
                  step="0.1"
                  placeholder="95"
                  value={measurements.hips}
                  onChange={(e) =>
                    setMeasurements((prev) => ({ ...prev, hips: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="arms" className="text-sm text-muted-foreground">
                  Arms
                </Label>
                <Input
                  id="arms"
                  type="number"
                  step="0.1"
                  placeholder="35"
                  value={measurements.arms}
                  onChange={(e) =>
                    setMeasurements((prev) => ({ ...prev, arms: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="thighs" className="text-sm text-muted-foreground">
                  Thighs
                </Label>
                <Input
                  id="thighs"
                  type="number"
                  step="0.1"
                  placeholder="60"
                  value={measurements.thighs}
                  onChange={(e) =>
                    setMeasurements((prev) => ({ ...prev, thighs: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Progress Photos */}
          <div className="space-y-2">
            <Label>Progress Photos (Optional)</Label>
            <div className="space-y-3">
              {photoPreviewUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {photoPreviewUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Progress photo ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border border-border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemovePhoto(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {photos.length < 5 && (
                <label htmlFor="photo-upload">
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors">
                    <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-1">
                      Click to upload progress photos
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {photos.length}/5 photos selected
                    </p>
                  </div>
                  <Input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePhotoSelect}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="How are you feeling? Any observations..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={logProgressMutation.isPending}>
              {logProgressMutation.isPending ? "Saving..." : "Save Progress"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
