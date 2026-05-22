import { Descarga } from '../../domain/entities/descarga';
import { workerPool } from '../../shared/utils/workerPool';
import { descargasRepository } from '../../interfaces/controllers/descargas.controller';
import { SystemSaturatedException } from '../exceptions/systemSaturatedException';

interface IniciarDescargaInput {
  url: string;
  tipo: string;
  maxReintentos: number;
}

export class IniciarDescargaUseCase {
  async ejecutar(input: IniciarDescargaInput): Promise<Descarga> {
    // Si el pool ya tiene demasiadas tareas (ej. más de 50), lanzamos saturación
    const tamañoCola = (workerPool as any).queue?.length || (workerPool as any).cola?.length || 0;
    if (tamañoCola > 50) {
      throw new SystemSaturatedException('El buffer del sistema de descargas se encuentra saturado.');
    }

    const id = Descarga.generarId();
    const nuevaDescarga = new Descarga(id, input.url, input.tipo);
    
    descargasRepository.save(nuevaDescarga);
    (workerPool as any).enqueue ? (workerPool as any).enqueue(nuevaDescarga) : (workerPool as any).encolarTarea(nuevaDescarga);

    return nuevaDescarga;
  }
}