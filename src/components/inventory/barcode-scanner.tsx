
'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { CameraOff } from 'lucide-react';
// We'll use a third-party library for robust barcode scanning
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

interface BarcodeScannerProps {
  onScan: (scannedCode: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const codeReader = useRef(new BrowserMultiFormatReader());

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startScanner = async () => {
      try {
        const constraints = { video: { facingMode: 'environment' } };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        setHasPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          codeReader.current.decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
            if (result) {
              onScan(result.getText());
            }
            if (err && !(err instanceof NotFoundException)) {
              console.error("Scan error:", err);
              setError("Ocurrió un error al escanear. Inténtalo de nuevo.");
            }
          });
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setHasPermission(false);
        setError("El acceso a la cámara es necesario para escanear. Por favor, habilita los permisos en tu navegador.");
        toast({
            variant: "destructive",
            title: "Error de Cámara",
            description: "No se pudo acceder a la cámara. Revisa los permisos."
        });
      }
    };

    startScanner();

    // Cleanup
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      codeReader.current.reset();
    };
  }, [onScan, toast]);

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
           <video ref={videoRef} className="h-full w-full object-cover" autoPlay playsInline muted />
           <div className="scanner-overlay absolute inset-0"></div>

           {hasPermission === false && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white p-4">
                <CameraOff className="h-12 w-12 mb-4" />
                <h3 className="text-lg font-semibold">Cámara no disponible</h3>
                <p className="text-center text-sm">Por favor, permite el acceso a la cámara en tu navegador para continuar.</p>
            </div>
           )}
        </div>
        
        {error && <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
      <style jsx>{`
        .scanner-overlay {
            box-shadow: inset 0 0 0 500px rgba(0,0,0,0.5);
            border: 2px solid white;
            border-radius: 8px;
            margin: 20px;
        }
      `}</style>
    </Dialog>
  );
}

