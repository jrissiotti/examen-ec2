import { Descarga } from '../../domain/entities/descarga';
import { workerPool } from '../../shared/utils/workerPool';
import { descargasRepository } from '../../interfaces/controllers/descargas.controller';

interface IniciarDescargaInput {
  url: string;
  tipo: string;
  maxReintentos: number;
}

export class IniciarDescargaUseCase {
  async ejecutar(input: IniciarDescargaInput): Promise<Descarga> {
    const id = `dl_${Math.random().toString(36).substring(2, 9)}`;

    // Instanciamos con los parámetros de tu entidad nativa
    const nuevaDescarga = new Descarga(id, input.url, input.tipo);
    
    descargasRepository.save(nuevaDescarga);

    // CORRECCIÓN: Volvemos a usar el método original del pool sin el bonus
    (workerPool as any).enqueue ? (workerPool as any).enqueue(nuevaDescarga) : (workerPool as any).encolarTarea(nuevaDescarga);

    return nuevaDescarga;
  }
}