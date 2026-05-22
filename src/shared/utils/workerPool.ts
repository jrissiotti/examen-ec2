import path from 'path';
import { Worker } from 'worker_threads';
import { MensajeWorker, RespuestaWorker } from '../types';
import { config } from '../config';
import { logger } from './logger';
import { descargasRepository } from '../../interfaces/controllers/descargas.controller';
import { EstadoDescarga } from '../enums';

interface Tarea {
  mensaje: MensajeWorker;
  resolver: (respuesta: RespuestaWorker) => void;
  rechazar: (error: Error) => void;
}

export class WorkerPool {
  private workers: Worker[] = [];
  private cola: Tarea[] = [];
  private tareasEnProgreso: Map<number, boolean> = new Map();
  private promesasVolátiles: Map<string, (respuesta: RespuestaWorker) => void> = new Map();

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
        const descarga = descargasRepository.get(respuesta.id);
        
        // Si es una notificación intermedia de progreso
        if ((respuesta as any).enProgreso) {
          if (descarga) {
            descarga.estado = EstadoDescarga.EN_PROGRESO;
            descarga.actualizarProgreso((respuesta as any).progreso);
            // LOG EN TERMINAL: Muestra el progreso actual
            logger.info(`[PROGRESO] Descarga ID: ${respuesta.id} va por el ${(respuesta as any).progreso}%`);
          }
          return;
        }

        // --- APARTADO DE LOGS EN TERMINAL CUANDO TERMINA UNA TRASFERENCIA ---
        if (respuesta.success) {
          logger.info(`[ÉXITO]  Descarga COMPLETADA exitosamente. ID: ${respuesta.id}`);
        } else {
          logger.error(`[FALLIDO] Descarga FALLIDA. ID: ${respuesta.id} - Razón: ${respuesta.error || 'Error desconocido'}`);
        }
        // --------------------------------------------------------------------

        if (descarga) {
          if (respuesta.success) {
            descarga.completar(respuesta.data || Buffer.from([]));
          } else {
            descarga.fallar(respuesta.error || 'Error en la descarga');
          }
        }

        const resolverPromesa = this.promesasVolátiles.get(respuesta.id);
        if (resolverPromesa) {
          resolverPromesa(respuesta);
          this.promesasVolátiles.delete(respuesta.id);
        }

        this.tareasEnProgreso.set(i, false);
        this.procesarCola();
      });

      worker.on('error', (error) => {
        logger.error(`Worker ${i} error crítico de hilo`, error);
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

    for (let i = 0; i < this.workers.length; i++) {
      if (!this.tareasEnProgreso.get(i)) {
        const tarea = this.cola.shift();
        
        if (tarea) {
          this.tareasEnProgreso.set(i, true);
          this.promesasVolátiles.set(tarea.mensaje.id, tarea.resolver);

          const descarga = descargasRepository.get(tarea.mensaje.id);
          if (descarga) {
            descarga.iniciar();
            descarga.intentos = (descarga.intentos ?? 0) + 1;
            
            // LOG EN TERMINAL: Muestra cuando el hilo principal saca la tarea de la cola FIFO y la procesa
            logger.info(`[PROCESO] Asignando Descarga ID: ${descarga.id} al Worker ${i} (Intento: ${descarga.intentos})`);
          }

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