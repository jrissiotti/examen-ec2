import { Descarga } from '../../domain/entities/descarga';
import { descargasRepository } from '../../interfaces/controllers/descargas.controller';

export class ListarDescargasUseCase {
  ejecutar(): Descarga[] {
    return descargasRepository.getAll ? descargasRepository.getAll() : Array.from((descargasRepository as any).values());
  }
}