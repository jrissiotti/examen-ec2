import path from 'path';
import { Worker } from 'worker_threads';
import { MensajeWorker, RespuestaWorker } from '../types';
import { config } from '../config';
import { logger } from './logger';
import { descargasRepository } from '../../interfaces/controllers/descargas.controller';
import { EstadoDescarga } from '../enums';
import { ErrorDescarga } from '../../domain/errors';

/**
 * Worker pool for concurrent downloads
 */
interface Tarea {
  mensaje: MensajeWorker;
  resolver: (respuesta: RespuestaWorker) => void;
  rechazar: (error: Error) => void;
}

export class WorkerPool {
  private workers: Worker[] = [];
  private cola: Tarea[] = [];
  private tareasEnProgreso: Map<number, boolean> = new Map();
  
  private promesasActivas: Map<string, { resolver: Function; rechazar: Function }> = new Map();

  constructor() {
    this.inicializarWorkers();
  }

  private inicializarWorkers(): void {
    const workerPath = path.join(config.WORKERS_PATH, 'descargaWorker.ts');

    for (let i = 0; i < config.MAX_CONCURRENT_WORKERS; i++) {
      const worker = new Worker(workerPath);

      worker.on('message', (respuesta: any) => {
        logger.debug(`Worker ${i} completed task ${respuesta.id}`);
        
        // TODO: Handle the response and release worker
        this.manejarRespuesta(respuesta, i);
      });

      worker.on('error', (error) => {
        logger.error(`Worker ${i} error`, error);
      });

      this.workers.push(worker);
      this.tareasEnProgreso.set(i, false);
    }

    logger.info(`Worker pool of ${config.MAX_CONCURRENT_WORKERS} initialized`);
  }

  private manejarRespuesta(respuesta: any, workerIndex: number): void {

    this.tareasEnProgreso.set(workerIndex, false);

    const { id, success, data, error, codigoError, progreso, tipoMensaje } = respuesta;
    const descarga = descargasRepository.get(id);

    if (tipoMensaje === 'PROGRESO' && descarga) {
      if (descarga.estado !== EstadoDescarga.EN_PROGRESO) {
        descarga.iniciar();
      }
      descarga.actualizarProgreso(progreso);
      return;
    }

    const promesas = this.promesasActivas.get(id);
    this.promesasActivas.delete(id);

    if (descarga) {
      if (success) {

        descarga.completar(data ? Buffer.from(data) : Buffer.alloc(0));
        if (promesas) promesas.resolver({ id, success: true, data });
      } else {
        descarga.fallar(new ErrorDescarga(error || 'Error desconocido', codigoError || 'SERVER_ERROR'));
        if (promesas) promesas.resolver({ id, success: false, error });
      }
    }

    this.procesarCola();
  }

  async enqueue(mensaje: MensajeWorker): Promise<RespuestaWorker> {
    return new Promise((resolver, rechazar) => {
      const tarea: Tarea = { mensaje, resolver, rechazar };
      this.cola.push(tarea);
      this.procesarCola();
    });
  }

  private procesarCola(): void {
    if (this.cola.length === 0) return;

    // TODO: Implement task distribution to free workers
    for (let i = 0; i < this.workers.length; i++) {
      // - Find a worker that is not busy
      if (!this.tareasEnProgreso.get(i)) {
        const tarea = this.cola.shift();
        
        if (tarea) {
          // - Mark it as busy
          this.tareasEnProgreso.set(i, true);
          
          // Guardamos el control de la promesa activa indexada por ID de descarga antes de despacharla
          this.promesasActivas.set(tarea.mensaje.id, {
            resolver: tarea.resolver,
            rechazar: tarea.rechazar
          });

          // Actualizamos el estado de la entidad en el dominio a EN_PROGRESO justo antes de enviarla
          const descarga = descargasRepository.get(tarea.mensaje.id);
          if (descarga) descarga.iniciar();

          // - Send the task
          this.workers[i].postMessage(tarea.mensaje);
        }
      }
    }
  }

  destruir(): void {
    this.workers.forEach((worker) => worker.terminate());
    this.cola = [];
    this.tareasEnProgreso.clear();
    this.promesasActivas.clear();
    logger.info('WorkerPool destroyed');
  }
}

export const workerPool = new WorkerPool();