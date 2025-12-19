
'use client';

import { ISalePopulated } from '@/models/Sale';
import QRCode from 'react-qr-code';
import Barcode from 'react-barcode';

interface InvoiceCodesProps {
    sale: ISalePopulated;
}

export function InvoiceCodes({ sale }: InvoiceCodesProps) {

    // Constructing the data for the QR code based on Venezuelan fiscal printer standards
    const qrData = JSON.stringify({
        "rifComercio": "J-40123456-7", // Placeholder RIF
        "idFactura": `00-${String(sale.invoiceNumber).padStart(8, '0')}`,
        "fecha": sale.createdAt,
        "monto": sale.totalAmount,
        "rifCliente": sale.customer?.idNumber || 'N/A'
    });

    const barcodeValue = `00${String(sale.invoiceNumber).padStart(8, '0')}`;

    return (
        <div className="flex flex-col md:flex-row items-center justify-around gap-4 pt-4">
            <div className="flex flex-col items-center">
                 <div style={{ height: "auto", margin: "0 auto", maxWidth: 128, width: "100%", background: 'white', padding: '8px', borderRadius: '4px' }}>
                    <QRCode
                        size={256}
                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                        value={qrData}
                        viewBox={`0 0 256 256`}
                    />
                </div>
                <p className="text-xs text-muted-foreground mt-2">Escanea para validar</p>
            </div>
            <div className="flex flex-col items-center">
                 <Barcode 
                    value={barcodeValue}
                    format="CODE128"
                    width={2}
                    height={60}
                    displayValue={true}
                    fontOptions="bold"
                    fontSize={16}
                    background="transparent"
                 />
            </div>
        </div>
    )
}
