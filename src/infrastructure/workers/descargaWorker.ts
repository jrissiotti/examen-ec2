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
  try {
    logger.debug(`Worker starting download: ${mensaje.id}`);

    const { id, url, tipo, maxReintentos } = mensaje;

    // TODO: Student implementation
    // 1. Instantiate downloader by type
    const descargador = DescargadorFactory.crear(tipo);

    // 2. Call ejecutarConReintento()
    // Ejecutamos la descarga usando el método de reintentos de la clase abstracta
    const data = await descargador.ejecutarConReintento(
      async () => await descargador.descargar(url),
      maxReintentos
    );

    // 3. Send result to main thread
    const respuesta: RespuestaWorker = {
      id,
      success: true,
      data: data,
      intentos: 1
    };

    parentPort!.postMessage(respuesta);
  } catch (error) {
    const respuesta: RespuestaWorker = {
      id: mensaje.id,
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      codigo: (error as { codigo?: string })?.codigo || 'UNKNOWN_ERROR',
      intentos: 0
    };

    parentPort!.postMessage(respuesta);
  }
});

logger.info('Worker ready and waiting for messages');