
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
    // Solicitar permiso y seleccionar puerto
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
    }
  } catch (error: any) {
    if (error.name === 'NotFoundError') throw new Error('No se seleccionó ningún dispositivo.');
    throw error;
  }
}

// 2. CONEXIÓN A IMPRESORA TÉRMICA (Web USB API)
export async function conectarImpresoraUSB() {
  if (!('usb' in navigator)) {
    throw new Error('Tu navegador no soporta Web USB API.');
  }

  try {
    // Filtrar por clase de dispositivo de impresión (0x07)
    const device = await navigator.usb.requestDevice({
      filters: [{ classCode: 0x07 }] 
    });

    await device.open();
    // Seleccionar configuración predeterminada (usualmente 1)
    if (device.configuration === null) await device.selectConfiguration(1);
    await device.claimInterface(0);

    // Ejemplo de comando ESC/POS crudo (Inicializar + Texto de Prueba + Corte)
    const encoder = new TextEncoder();
    const init = new Uint8Array([0x1B, 0x40]); // ESC @ (Init)
    const text = encoder.encode('\nKREA BUSINESS POS\nPRUEBA EXITOSA\n\n\n\n');
    const cut = new Uint8Array([0x1D, 0x56, 0x00]); // GS V 0 (Cut)

    const data = new Uint8Array(init.length + text.length + cut.length);
    data.set(init);
    data.set(text, init.length);
    data.set(cut, init.length + text.length);

    // Enviar al endpoint de salida (usualmente el 1 o 2 en impresoras térmicas)
    await device.transferOut(1, data);
    
    return { name: device.productName, status: 'Connected' };
  } catch (error: any) {
    throw new Error('Error de vinculación USB: ' + error.message);
  }
}

// 3. CONEXIÓN POR IP (Protocolo de Red IOT)
export async function vincularDispositivoIP(ipAddress: string) {
  console.log(`Intentando apretón de manos con: ${ipAddress}`);
  
  /**
   * NOTA TÉCNICA: Los navegadores bloquean conexiones TCP directas por seguridad (CORS/Mixed Content).
   * Para impresoras de red, es mejor usar un "WebSocket Bridge" local o que el hardware
   * tenga un endpoint HTTP con soporte CORS habilitado.
   */
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
    throw new Error('No se pudo establecer conexión con la IP. Verifique que el dispositivo esté encendido y en la misma red.');
  }
}
