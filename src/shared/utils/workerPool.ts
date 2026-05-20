import path from 'path';
import { Worker } from 'worker_threads';
import { MensajeWorker, RespuestaWorker } from '../types';
import { config } from '../config';
import { logger } from './logger';
import { descargasRepository } from '../../interfaces/controllers/descargas.controller';
import { EstadoDescarga } from '../enums';

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

  constructor() {
    this.inicializarWorkers();
  }

  private inicializarWorkers(): void {
    const workerPath = path.join(config.WORKERS_PATH, 'descargaWorker.ts');

    for (let i = 0; i < config.MAX_CONCURRENT_WORKERS; i++) {
      const worker = new Worker(workerPath, {
        execArgv: ['-r', 'ts-node/register']
      });

      worker.on('message', (respuesta: RespuestaWorker) => {
        logger.debug(`Worker ${i} completed task ${respuesta.id}`);
        
        // TODO: Handle the response and release worker
        // 1. Buscamos y actualizamos la entidad en el repositorio global
        const descarga = descargasRepository.get(respuesta.id);
        if (descarga) {
          if (respuesta.success) {
            descarga.estado = EstadoDescarga.COMPLETADA;
            descarga.progreso = 100;
            descarga.data = respuesta.data;
          } else {
            descarga.estado = EstadoDescarga.FALLIDA;
            descarga.error = respuesta.error || 'Error en la descarga';
          }
          descarga.tiempoFin = Date.now();
        }

        // 2. Liberamos el worker marcándolo como no ocupado
        this.tareasEnProgreso.set(i, false);

        // 3. Procesamos el siguiente elemento en la cola si existe
        this.procesarCola();
      });

      worker.on('error', (error) => {
        logger.error(`Worker ${i} error`, error);
        this.tareasEnProgreso.set(i, false);
        this.procesarCola();
      });

      this.workers.push(worker);
      this.tareasEnProgreso.set(i, false);
    }

    logger.info(`Worker pool of ${config.MAX_CONCURRENT_WORKERS} initialized`);
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

          // Escuchamos el evento de este worker una única vez para resolver la promesa del enqueue
          const manejarRespuestaUnica = (respuesta: RespuestaWorker) => {
            if (respuesta.id === tarea.mensaje.id) {
              tarea.resolver(respuesta);
              this.workers[i].off('message', manejarRespuestaUnica);
            }
          };
          this.workers[i].on('message', manejarRespuestaUnica);

          // Actualizamos el estado del dominio a EN_PROGRESO al iniciar la transferencia
          const descarga = descargasRepository.get(tarea.mensaje.id);
          if (descarga) {
            descarga.estado = EstadoDescarga.EN_PROGRESO;
            descarga.intentos = (descarga.intentos ?? 0) + 1;
          }

          // - Send the task
          this.workers[i].postMessage(tarea.mensaje);
        }
      }
    }
  }

  destruir(): void {
    this.workers.forEach((worker) => worker.terminate());
    logger.info('WorkerPool destroyed');
  }
}

export const workerPool = new WorkerPool();