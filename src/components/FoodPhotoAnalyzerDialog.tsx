import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface FoodPhotoAnalyzerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAnalysisComplete: (data: { name: string; calories: number; protein: number; carbs: number; fats: number }) => void;
}

export function FoodPhotoAnalyzerDialog({ open, onOpenChange, onAnalysisComplete }: FoodPhotoAnalyzerDialogProps) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);
      }
    } catch (error) {
      toast({
        title: 'Camera Error',
        description: 'Unable to access camera. Please check permissions.',
        variant: 'destructive',
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const photoData = canvas.toDataURL('image/jpeg', 0.8);
        setPhoto(photoData);
        stopCamera();
      }
    }
  };

  const analyzePhoto = async () => {
    if (!photo) return;

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-food-photo', {
        body: { image: photo.split(',')[1] }
      });

      if (error) throw error;

      if (data?.nutrition) {
        onAnalysisComplete({
          name: data.nutrition.name,
          calories: data.nutrition.calories,
          protein: data.nutrition.protein,
          carbs: data.nutrition.carbs,
          fats: data.nutrition.fats,
        });
        toast({
          title: 'Analysis Complete',
          description: `Identified: ${data.nutrition.name}`,
        });
        handleClose();
      }
    } catch (error) {
      toast({
        title: 'Analysis Failed',
        description: error instanceof Error ? error.message : 'Unable to analyze photo',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    setPhoto(null);
    onOpenChange(false);
  };

  const retakePhoto = () => {
    setPhoto(null);
    startCamera();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Analyze Food Photo</DialogTitle>
          <DialogDescription>
            Take a photo of your meal to get nutrition estimates
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!photo && !isCameraActive && (
            <Button onClick={startCamera} className="w-full">
              <Camera className="mr-2 h-4 w-4" />
              Start Camera
            </Button>
          )}

          {isCameraActive && (
            <div className="space-y-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg"
              />
              <div className="flex gap-2">
                <Button onClick={capturePhoto} className="flex-1">
                  <Camera className="mr-2 h-4 w-4" />
                  Capture
                </Button>
                <Button onClick={stopCamera} variant="outline">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {photo && (
            <div className="space-y-4">
              <img src={photo} alt="Captured food" className="w-full rounded-lg" />
              <div className="flex gap-2">
                <Button
                  onClick={analyzePhoto}
                  disabled={isAnalyzing}
                  className="flex-1"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Analyze Photo'
                  )}
                </Button>
                <Button onClick={retakePhoto} variant="outline" disabled={isAnalyzing}>
                  Retake
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
