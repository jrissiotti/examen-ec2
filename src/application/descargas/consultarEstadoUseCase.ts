import { Descarga } from '../../domain/entities/descarga';
import { descargasRepository } from '../../interfaces/controllers/descargas.controller';
import { ErrorDescarga } from '../../domain/errors/index';

export class ObtenerEstadoUseCase {
  ejecutar(id: string): Descarga {
    const descarga = descargasRepository.get(id);
    if (!descarga) {
      throw new ErrorDescarga(`No se encontró la descarga con ID: ${id}`, 'NOT_FOUND');
    }
    return descarga;
  }
}