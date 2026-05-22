import { parentPort } from 'worker_threads';
import { MensajeWorker, RespuestaWorker } from '../../shared/types';
import { logger } from '../../shared/utils/logger';
import { DescargadorFactory } from '../../domain/factories/descargadorFactory';

if (!parentPort) {
  throw new Error('This script must be executed as a Worker');
}

parentPort.on('message', async (mensaje: MensajeWorker) => {
  try {
    logger.debug(`Worker starting download: ${mensaje.id}`);
    
    const { id, url, tipo, maxReintentos } = mensaje;

    // 1. Instanciamos el descargador por tipo usando la Factory nativa del dominio
    const descargador = DescargadorFactory.crear(tipo);

    // 2. Ejecutamos la descarga usando el método original de la clase abstracta
    const data = await descargador.ejecutarConReintento(
      async () => await descargador.descargar(url),
      maxReintentos
    );

    // 3. Enviamos el resultado final al hilo principal sin pasos intermedios inventados
    const respuesta: RespuestaWorker = {
      id,
      success: true,
      data: data,
      intentos: 1
    };

    parentPort!.postMessage(respuesta);
  } catch (error: any) {
    const respuesta: RespuestaWorker = {
      id: mensaje.id,
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      codigo: error?.codigo || 'UNKNOWN_ERROR',
      intentos: 0
    };

    parentPort!.postMessage(respuesta);
  }
});

logger.info('Worker ready and waiting for messages');