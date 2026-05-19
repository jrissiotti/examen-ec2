import { parentPort } from 'worker_threads';
import { MensajeWorker, RespuestaWorker } from '../../shared/types';
import { logger } from '../../shared/utils/logger';
import { DescargadorFactory } from '../../domain/factories/descargadorFactory';

/**
 * Worker that executes downloads in isolation
 */
if (!parentPort) {
  throw new Error('This script must be executed as a Worker');
}

parentPort.on('message', async (mensaje: MensajeWorker) => {
  const { id, url, tipo, maxReintentos } = mensaje;

  try {
    logger.debug(`Worker starting download: ${id}`);

    // TODO: Student implementation
    // 1. Instantiate downloader by type
    const descargador = DescargadorFactory.crear(tipo);

    // Reportamos un progreso inicial en tiempo real
    parentPort!.postMessage({
      id,
      tipoMensaje: 'PROGRESO',
      progreso: 15
    });

    // 2. Call ejecutarConReintento()
    // El descargador ejecuta internamente los reintentos automáticos configurados
    const data = await descargador.descargar(url);

    // Reportamos un progreso intermedio antes de finalizar
    parentPort!.postMessage({
      id,
      tipoMensaje: 'PROGRESO',
      progreso: 70
    });

    // 3. Send result to main thread
    // Convertimos el Buffer a una estructura plana (Uint8Array -> Array) segura para pasarse entre hilos
    const respuesta = {
      id,
      tipoMensaje: 'FINALIZADO',
      success: true,
      data: Array.from(new Uint8Array(data)),
      progreso: 100
    };

    parentPort!.postMessage(respuesta);

  } catch (error: any) {
    logger.error(`Worker failed processing task ${id}: ${error.message}`);

    // Mapeamos el error hacia la estructura que espera decodificar el pool en el hilo principal
    const respuesta = {
      id,
      tipoMensaje: 'FINALIZADO',
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      codigoError: error.codigo || 'SERVER_ERROR',
      progreso: 0
    };

    parentPort!.postMessage(respuesta);
  }
});

logger.info('Worker ready and waiting for messages');