
/**
 * @fileOverview Drivers de comunicación para periféricos POS (Krea Business Core).
 * Implementa Web Serial API, Web USB API y Protocolos de Red.
 */

// 1. CONEXIÓN A BALANZA (Web Serial API)
export async function conectarBalanza() {
  if (!('serial' in navigator)) {
    throw new Error('Tu navegador no soporta Web Serial API. Usa Chrome o Edge.');
  }

  try {
    // Solicitar permiso y seleccionar puerto. 
    // Los puertos seriales son genéricos y no permiten filtrar por "clase" como USB.
    // Se muestran los dispositivos seriales (COM/tty) conectados.
    const port = await (navigator as any).serial.requestPort();
    
    // Configuración estándar de balanzas comerciales
    await port.open({ 
      baudRate: 9600, 
      dataBits: 8, 
      stopBits: 1, 
      parity: 'none',
      flowControl: 'none'
    });

    const reader = port.readable.getReader();
    let partialData = '';

    console.log('--- BALANZA VINCULADA: ESCUCHANDO FLUJO ---');

    // Bucle de lectura asíncrono
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        // Convertir bytes a texto y limpiar
        const chunk = new TextDecoder().decode(value);
        partialData += chunk;

        // Si detectamos un fin de línea, procesamos el peso
        if (partialData.includes('\n') || partialData.includes('\r')) {
          const rawWeight = partialData.trim();
          // Extraer solo números y decimales (RegEx)
          const numericWeight = rawWeight.match(/[0-9.]+/g)?.join('') || '0';
          console.log('Peso detectado:', numericWeight);
          partialData = ''; // Reset para la siguiente lectura
          return parseFloat(numericWeight);
        }
      }
    } finally {
      reader.releaseLock();
      await port.close();
    }
  } catch (error: any) {
    if (error.name === 'NotFoundError') throw new Error('Operación cancelada. No se seleccionó ningún dispositivo serial.');
    throw error;
  }
}

// 2. CONEXIÓN A IMPRESORA TÉRMICA (Web USB API)
export async function conectarImpresoraUSB() {
  if (!('usb' in navigator)) {
    throw new Error('Tu navegador no soporta Web USB API.');
  }

  try {
    // FILTRO ESTRICTO: Solo dispositivos con Class Code 07 (Printers)
    // Esto evita que aparezcan mouses, teclados o cámaras en la lista.
    const device = await navigator.usb.requestDevice({
      filters: [{ classCode: 7 }] 
    });

    await device.open();
    // Seleccionar configuración predeterminada (usualmente 1)
    if (device.configuration === null) await device.selectConfiguration(1);
    
    // Intentar reclamar la interfaz de impresión
    try {
        await device.claimInterface(0);
    } catch (e) {
        console.warn('La interfaz 0 ya está en uso o no es accesible.');
    }

    // Ejemplo de comando ESC/POS crudo (Inicializar + Texto de Prueba + Corte)
    const encoder = new TextEncoder();
    const init = new Uint8Array([0x1B, 0x40]); // ESC @ (Init)
    const text = encoder.encode('\nKREA BUSINESS POS\nPRUEBA DE VINCULACION USB\nSISTEMA OPERATIVO\n\n\n\n');
    const cut = new Uint8Array([0x1D, 0x56, 0x00]); // GS V 0 (Cut)

    const data = new Uint8Array(init.length + text.length + cut.length);
    data.set(init);
    data.set(text, init.length);
    data.set(cut, init.length + text.length);

    // Enviar al endpoint de salida (usualmente el 1 o 2 en impresoras térmicas)
    try {
        await device.transferOut(1, data);
    } catch (err) {
        console.error('Error al transferir datos. Intentando endpoint 2...');
        await device.transferOut(2, data);
    }
    
    return { name: device.productName || 'Impresora Térmica USB', status: 'Connected' };
  } catch (error: any) {
    if (error.name === 'NotFoundError') {
        throw new Error('No se encontraron impresoras USB compatibles o se canceló la selección. Verifique que sea una impresora de clase 07.');
    }
    throw new Error('Error de vinculación USB: ' + error.message);
  }
}

// 3. CONEXIÓN POR IP (Protocolo de Red IOT)
export async function vincularDispositivoIP(ipAddress: string) {
  console.log(`Intentando apretón de manos con: ${ipAddress}`);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`http://${ipAddress}/status`, { 
      method: 'GET', 
      mode: 'no-cors',
      signal: controller.signal 
    });

    clearTimeout(timeoutId);
    return { success: true, message: 'Dispositivo alcanzable en la red.' };
  } catch (error) {
    throw new Error('No se pudo establecer conexión con la IP. Verifique que el dispositivo esté encendido y en la misma red local.');
  }
}
