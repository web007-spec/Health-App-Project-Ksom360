import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, Upload, X, Sparkles, CheckCircle2, Heart, Footprints, Flame, Timer, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface HealthMetric {
  data_type: string;
  value: number;
  unit: string;
  label: string;
}

interface HealthSnapshotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const METRIC_ICONS: Record<string, React.ReactNode> = {
  steps: <Footprints className="h-4 w-4" />,
  calories_burned: <Flame className="h-4 w-4" />,
  heart_rate: <Heart className="h-4 w-4" />,
  resting_heart_rate: <Heart className="h-4 w-4" />,
  active_minutes: <Timer className="h-4 w-4" />,
  workout: <Timer className="h-4 w-4" />,
};

const METRIC_COLORS: Record<string, string> = {
  steps: 'text-primary',
  calories_burned: 'text-primary',
  heart_rate: 'text-destructive',
  resting_heart_rate: 'text-destructive',
  active_minutes: 'text-primary',
  workout: 'text-primary',
};

export function HealthSnapshotDialog({ open, onOpenChange }: HealthSnapshotDialogProps) {
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{ metrics: HealthMetric[]; summary: string; date: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleFileSelect = (file: File) => {
    setImageFile(file);
    setResult(null);
    setError(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!imageFile) return;
    setAnalyzing(true);
    setError(null);

    try {
      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });

      const { data: { session } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('analyze-health-screenshot', {
        body: { image: base64 },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) throw new Error(response.error.message || 'Analysis failed');

      const data = response.data;
      if (data.error) throw new Error(data.error);

      if (!data.success || !data.metrics?.length) {
        setError(data.message || 'No health metrics detected. Try a clearer screenshot of your Apple Health app.');
        return;
      }

      setResult({
        metrics: data.metrics,
        summary: data.summary,
        date: data.date,
      });

      // Refresh health data queries
      queryClient.invalidateQueries({ queryKey: ['health-data'] });
      queryClient.invalidateQueries({ queryKey: ['health-stats'] });
      queryClient.invalidateQueries({ queryKey: ['health-connections'] });

      toast.success(`${data.count} health metrics imported successfully!`);
    } catch (err: any) {
      const msg = err.message || 'Failed to analyze screenshot';
      setError(msg);
      toast.error(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    setImage(null);
    setImageFile(null);
    setResult(null);
    setError(null);
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Health Snapshot
          </DialogTitle>
          <DialogDescription>
            Take a screenshot of your Apple Health app and our AI will automatically import your health data — no setup needed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step indicator */}
          <div className="flex items-center gap-2 text-sm">
            <div className={`flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold ${!image ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>1</div>
            <span className={!image ? 'font-medium' : 'text-muted-foreground'}>Upload screenshot</span>
            <div className="h-px flex-1 bg-border" />
            <div className={`flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold ${image && !result ? 'bg-primary text-primary-foreground' : image && result ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>2</div>
            <span className={image && !result ? 'font-medium' : 'text-muted-foreground'}>AI analyzes</span>
            <div className="h-px flex-1 bg-border" />
            <div className={`flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold ${result ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>3</div>
            <span className={result ? 'font-medium text-green-600' : 'text-muted-foreground'}>Imported!</span>
          </div>

          {/* Upload area */}
          {!image ? (
            <div className="space-y-3">
              <div
                className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium">Upload Apple Health Screenshot</p>
                <p className="text-sm text-muted-foreground mt-1">PNG, JPG up to 10MB</p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose File
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Take Photo
                </Button>
              </div>

              <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">💡 Tips for best results:</p>
                <p>• Open Apple Health → Summary tab</p>
                <p>• Take a screenshot showing your daily stats</p>
                <p>• Works with Activity, Heart Rate, Steps screens</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Image preview */}
              <div className="relative rounded-xl overflow-hidden border border-border">
                <img
                  src={image}
                  alt="Health screenshot"
                  className="w-full max-h-64 object-contain bg-black"
                />
                {!analyzing && !result && (
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={handleReset}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {/* Results */}
              {result ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-primary">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">Data imported successfully!</span>
                  </div>

                  {result.summary && (
                    <p className="text-sm text-muted-foreground italic">"{result.summary}"</p>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    {result.metrics.map((metric, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg border bg-card p-3">
                        <span className={METRIC_COLORS[metric.data_type] || 'text-primary'}>
                          {METRIC_ICONS[metric.data_type] || <Sparkles className="h-4 w-4" />}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground truncate">{metric.label}</p>
                          <p className="font-semibold text-sm">{metric.value.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{metric.unit}</span></p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={handleReset}>
                      Scan Another
                    </Button>
                    <Button className="flex-1" onClick={handleClose}>
                      View Dashboard
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  {!analyzing && (
                    <Button variant="outline" className="flex-1" onClick={handleReset}>
                      Change Image
                    </Button>
                  )}
                  <Button
                    className="flex-1"
                    onClick={handleAnalyze}
                    disabled={analyzing}
                  >
                    {analyzing ? (
                      <>
                        <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Import Health Data
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
        />

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
        />
      </DialogContent>
    </Dialog>
  );
}
