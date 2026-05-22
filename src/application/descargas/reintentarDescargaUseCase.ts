import { Descarga } from '../../domain/entities/descarga';
import { workerPool } from '../../shared/utils/workerPool';
import { descargasRepository } from '../../interfaces/controllers/descargas.controller';
import { EstadoDescarga } from '../../shared/enums/index';
import { NotFoundException } from '../exceptions/notFoundException';
import { InvalidStateException } from '../exceptions/invalidStateException';

export class ReintentarDescargaUseCase {
  async ejecutar(id: string): Promise<Descarga> {
    const descarga = descargasRepository.get(id);

    if (!descarga) {
      throw new NotFoundException(`No se encontró la descarga con ID: ${id}`);
    }

    if (descarga.estado !== EstadoDescarga.FALLIDA) {
      throw new InvalidStateException('Solo se pueden reintentar descargas en estado FALLIDA');
    }

    descarga.estado = EstadoDescarga.PENDIENTE;
    descarga.actualizarProgreso(0);

    workerPool.enqueue({
      id: descarga.id,
      url: descarga.url,
      tipo: descarga.tipo as 'http' | 'ftp' | 'mock',
      maxReintentos: 3
    }).catch(() => {});

    return descarga;
  }
}