import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, Video, X, CheckCircle2, AlertCircle, FileVideo, RefreshCw } from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { validateVideoFile, uploadVideo, getMaxVideoSizeLabel, type UploadProgress } from "@/lib/videoUpload";
import { generateAndUploadThumbnail } from "@/lib/videoThumbnail";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BulkVideoUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FileItem {
  id: string;
  file: File;
  name: string;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
  isDuplicate?: boolean;
  duplicateExerciseId?: string;
}

function cleanFileName(fileName: string): string {
  // Remove extension, replace separators with spaces, trim
  const withoutExt = fileName.replace(/\.[^.]+$/, "");
  return withoutExt
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase()); // Title case
}

export function BulkVideoUploadDialog({ open, onOpenChange }: BulkVideoUploadDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<FileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [duplicateAlert, setDuplicateAlert] = useState<{ fileItems: FileItem[]; nonDuplicates: FileItem[] } | null>(null);

  // Fetch existing exercise names for duplicate detection
  const { data: existingExercises } = useQuery({
    queryKey: ["exercises-names", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("exercises")
        .select("id, name")
        .eq("trainer_id", user.id);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const handleFilesSelected = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const existingNames = new Set(
      (existingExercises || []).map((e) => e.name.toLowerCase())
    );
    // Also check already-queued files
    const queuedNames = new Set(
      files.map((f) => f.name.toLowerCase())
    );

    const newFiles: FileItem[] = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const validationError = validateVideoFile(file);
      const cleanedName = cleanFileName(file.name);
      const isDuplicate = existingNames.has(cleanedName.toLowerCase()) || queuedNames.has(cleanedName.toLowerCase());
      const matchingExercise = isDuplicate
        ? (existingExercises || []).find((e) => e.name.toLowerCase() === cleanedName.toLowerCase())
        : undefined;

      newFiles.push({
        id: `${Date.now()}-${i}`,
        file,
        name: cleanedName,
        status: validationError ? "error" : "pending",
        progress: 0,
        error: validationError || undefined,
        isDuplicate,
        duplicateExerciseId: matchingExercise?.id,
      });
    }

    const duplicates = newFiles.filter((f) => f.isDuplicate && f.status !== "error");
    const nonDuplicates = newFiles.filter((f) => !f.isDuplicate || f.status === "error");

    if (duplicates.length > 0) {
      setDuplicateAlert({ fileItems: duplicates, nonDuplicates });
    } else {
      setFiles((prev) => [...prev, ...newFiles]);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [existingExercises, files]);

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleUploadAll = async () => {
    if (!user?.id) return;

    const pendingFiles = files.filter((f) => f.status === "pending");
    if (pendingFiles.length === 0) return;

    setIsProcessing(true);

    for (const fileItem of pendingFiles) {
      // Update status to uploading
      setFiles((prev) =>
        prev.map((f) => (f.id === fileItem.id ? { ...f, status: "uploading" as const, progress: 0 } : f))
      );

      try {
        const videoUrl = await uploadVideo(
          fileItem.file,
          user.id,
          "exercise-videos",
          (p: UploadProgress) => {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileItem.id ? { ...f, progress: p.percentage } : f
              )
            );
          }
        );

        // Auto-generate thumbnail from video
        let imageUrl: string | null = null;
        try {
          imageUrl = await generateAndUploadThumbnail(videoUrl, user.id);
        } catch (thumbErr) {
          console.warn("Thumbnail generation failed, continuing without:", thumbErr);
        }

        // Create or replace exercise entry
        if (fileItem.duplicateExerciseId) {
          const updateData: any = { video_url: videoUrl };
          if (imageUrl) updateData.image_url = imageUrl;
          const { error } = await supabase.from("exercises").update(updateData).eq("id", fileItem.duplicateExerciseId);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("exercises").insert({
            name: fileItem.name,
            video_url: videoUrl,
            image_url: imageUrl,
            trainer_id: user.id,
          });
          if (error) throw error;
        }

        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id ? { ...f, status: "done" as const, progress: 100 } : f
          )
        );
      } catch (err: any) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id
              ? { ...f, status: "error" as const, error: err?.message || "Upload failed" }
              : f
          )
        );
      }
    }

    setIsProcessing(false);
    queryClient.invalidateQueries({ queryKey: ["exercises"] });
    queryClient.invalidateQueries({ queryKey: ["exercises-names"] });
    toast({
      title: "Bulk upload complete",
      description: "You can now edit each exercise to add details like muscle group, equipment, and tags.",
    });
  };

  const handleDuplicateReplace = () => {
    if (!duplicateAlert) return;
    // Add all files (duplicates marked for replacement + non-duplicates)
    setFiles((prev) => [...prev, ...duplicateAlert.fileItems, ...duplicateAlert.nonDuplicates]);
    setDuplicateAlert(null);
  };

  const handleDuplicateSkip = () => {
    if (!duplicateAlert) return;
    // Only add non-duplicates
    setFiles((prev) => [...prev, ...duplicateAlert.nonDuplicates]);
    setDuplicateAlert(null);
  };

  const handleClose = (openState: boolean) => {
    if (isProcessing) return; // prevent closing during upload
    if (!openState) {
      setFiles([]);
    }
    onOpenChange(openState);
  };

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const doneCount = files.filter((f) => f.status === "done").length;
  const errorCount = files.filter((f) => f.status === "error").length;

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Bulk Video Upload
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Drop zone */}
          <div
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isProcessing) handleFilesSelected(e.dataTransfer.files);
            }}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isProcessing
                ? "border-muted cursor-not-allowed opacity-50"
                : "border-border cursor-pointer hover:border-primary"
            }`}
          >
            <Video className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">
              Click or drag & drop multiple videos
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              MP4, MOV, or WebM • Up to {getMaxVideoSizeLabel()} each
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            multiple
            onChange={(e) => handleFilesSelected(e.target.files)}
            className="hidden"
          />

          {/* File list */}
          {files.length > 0 && (
            <>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {files.length} video{files.length !== 1 ? "s" : ""} selected
                  {doneCount > 0 && ` • ${doneCount} uploaded`}
                  {errorCount > 0 && ` • ${errorCount} failed`}
                </span>
                {!isProcessing && pendingCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setFiles([])}>
                    Clear all
                  </Button>
                )}
              </div>

              <ScrollArea className="flex-1 max-h-[300px]">
                <div className="space-y-2 pr-4">
                  {files.map((fileItem) => (
                    <div
                      key={fileItem.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
                    >
                      <div className="shrink-0">
                        {fileItem.status === "done" ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : fileItem.status === "error" ? (
                          <AlertCircle className="h-5 w-5 text-destructive" />
                        ) : (
                          <FileVideo className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">{fileItem.name}</p>
                          {fileItem.isDuplicate && fileItem.status !== "done" && (
                            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground">
                              <RefreshCw className="h-3 w-3" />
                              Replace
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatSize(fileItem.file.size)}
                          {fileItem.error && (
                            <span className="text-destructive ml-2">{fileItem.error}</span>
                          )}
                        </p>
                        {fileItem.status === "uploading" && (
                          <Progress value={fileItem.progress} className="h-1.5 mt-1.5" />
                        )}
                      </div>
                      {!isProcessing && fileItem.status !== "done" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 h-7 w-7"
                          onClick={() => removeFile(fileItem.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2 border-t">
            <Button variant="outline" onClick={() => handleClose(false)} disabled={isProcessing}>
              {doneCount > 0 && pendingCount === 0 ? "Done" : "Cancel"}
            </Button>
            {pendingCount > 0 && (
              <Button onClick={handleUploadAll} disabled={isProcessing}>
                {isProcessing
                  ? "Uploading..."
                  : `Upload ${pendingCount} Video${pendingCount !== 1 ? "s" : ""}`}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <AlertDialog open={!!duplicateAlert} onOpenChange={(open) => !open && setDuplicateAlert(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Duplicate Videos Detected</AlertDialogTitle>
          <AlertDialogDescription>
            {duplicateAlert?.fileItems.length === 1
              ? `"${duplicateAlert.fileItems[0].name}" already exists in your exercise library.`
              : `${duplicateAlert?.fileItems.length} videos already exist in your exercise library: ${duplicateAlert?.fileItems.map((f) => `"${f.name}"`).join(", ")}.`}
            {" "}Would you like to replace the existing video{(duplicateAlert?.fileItems.length ?? 0) > 1 ? "s" : ""} or skip {(duplicateAlert?.fileItems.length ?? 0) > 1 ? "them" : "it"}?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleDuplicateSkip}>
            Skip Duplicate{(duplicateAlert?.fileItems.length ?? 0) > 1 ? "s" : ""}
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleDuplicateReplace}>
            Replace
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
