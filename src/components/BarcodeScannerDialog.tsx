import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Html5Qrcode } from "html5-qrcode";
import { Loader2, Camera, X } from "lucide-react";
import { toast } from "sonner";

interface BarcodeScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductScanned: (productData: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  }) => void;
}

export const BarcodeScannerDialog = ({
  open,
  onOpenChange,
  onProductScanned,
}: BarcodeScannerDialogProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const fetchProductData = async (barcode: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
      );
      const data = await response.json();

      if (data.status === 1 && data.product) {
        const product = data.product;
        const nutriments = product.nutriments || {};

        onProductScanned({
          name: product.product_name || "Unknown Product",
          calories: Math.round(nutriments.energy_value || nutriments["energy-kcal_100g"] || 0),
          protein: Math.round(nutriments.proteins_100g || 0),
          carbs: Math.round(nutriments.carbohydrates_100g || 0),
          fats: Math.round(nutriments.fat_100g || 0),
        });

        toast.success("Product found! Review and adjust serving size.");
        onOpenChange(false);
      } else {
        toast.error("Product not found in database. Please enter manually.");
      }
    } catch (error) {
      console.error("Error fetching product data:", error);
      toast.error("Failed to fetch product data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const startScanner = async () => {
    try {
      setIsScanning(true);
      const scanner = new Html5Qrcode("barcode-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          scanner.stop();
          fetchProductData(decodedText);
        },
        () => {
          // Error callback - do nothing
        }
      );
    } catch (error) {
      console.error("Error starting scanner:", error);
      toast.error("Failed to access camera. Please check permissions.");
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (error) {
        console.error("Error stopping scanner:", error);
      }
    }
    setIsScanning(false);
  };

  useEffect(() => {
    if (open && !isScanning) {
      startScanner();
    }

    return () => {
      if (scannerRef.current) {
        stopScanner();
      }
    };
  }, [open]);

  const handleClose = () => {
    stopScanner();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scan Barcode
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative bg-muted rounded-lg overflow-hidden" style={{ minHeight: "300px" }}>
            <div id="barcode-reader" className="w-full" />
            {isLoading && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Position the barcode within the frame</p>
            <p>Make sure the barcode is well lit and in focus</p>
          </div>

          <Button onClick={handleClose} variant="outline" className="w-full">
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
