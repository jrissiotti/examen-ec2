import { Descarga } from '../../domain/entities/descarga';
import { descargasRepository } from '../../interfaces/controllers/descargas.controller';
import { NotFoundException } from '../exceptions/notFoundException';

export class ObtenerEstadoUseCase {
  ejecutar(id: string): Descarga {
    const descarga = descargasRepository.get(id);
    
    if (!descarga) {
      throw new NotFoundException(`No se encontró la descarga con ID: ${id}`);
    }
    
    return descarga;
  }
}