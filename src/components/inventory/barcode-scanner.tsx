'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { CameraOff } from 'lucide-react';
import { BrowserMultiFormatReader, NotFoundException, BarcodeFormat, DecodeHintType } from '@zxing/library';

interface BarcodeScannerProps {
  onScan: (scannedCode: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Create a ref for the code reader instance
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    // Initialize the code reader with hints
    const hints = new Map();
    const formats = [
        BarcodeFormat.QR_CODE,
        BarcodeFormat.CODE_128,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
    ];
    hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
    codeReader.current = new BrowserMultiFormatReader(hints);

    // Request camera permission
    const getCameraPermission = async () => {
      try {
        const constraints = { video: { facingMode: 'environment' } };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        setHasPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Camera access error:', err);
        setHasPermission(false);
        setError(
          'El acceso a la cámara es necesario para escanear. Por favor, habilita los permisos en tu navegador.'
        );
        toast({
          variant: 'destructive',
          title: 'Error de Cámara',
          description: 'No se pudo acceder a la cámara. Revisa los permisos.',
        });
      }
    };
    getCameraPermission();

    // Cleanup on component unmount
    return () => {
      codeReader.current?.reset();
    };
  }, [toast]);

   const startScanner = useCallback(() => {
    if (videoRef.current && codeReader.current && hasPermission) {
      codeReader.current.decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
        if (result) {
          onScan(result.getText());
        }
        if (err && !(err instanceof NotFoundException)) {
          console.error('Scan error:', err);
          // Don't set a user-facing error for minor scan issues, only persistent ones.
        }
      }).catch(scanError => {
         console.error('DecodeFromVideoDevice error:', scanError);
         setError('No se pudo iniciar el escáner. ¿Otra aplicación está usando la cámara?');
      })
    }
  }, [hasPermission, onScan]);


  return (
    <Dialog open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Escanear Código de Barras / QR</DialogTitle>
          <DialogDescription>
            Apunta la cámara al código del producto. La captura será automática.
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-video w-full overflow-hidden rounded-md border bg-muted">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            autoPlay
            playsInline
            muted
            onCanPlay={startScanner}
          />
          <div className="scanner-overlay absolute inset-0 flex items-center justify-center">
            <div className="h-1/2 w-4/5 rounded-lg border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-red-500 animate-scan"></div>
            </div>
          </div>


          {hasPermission === false && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 p-4 text-white">
              <CameraOff className="mb-4 h-12 w-12" />
              <h3 className="text-lg font-semibold">Cámara no disponible</h3>
              <p className="text-center text-sm">
                Por favor, permite el acceso a la cámara en tu navegador para
                continuar.
              </p>
            </div>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
         <style jsx>{`
            @keyframes scan {
                0%, 100% { transform: translateY(-50px); }
                50% { transform: translateY(50px); }
            }
            .animate-scan {
                animation: scan 2s ease-in-out infinite;
            }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
