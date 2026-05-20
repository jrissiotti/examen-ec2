import { Descarga } from '../../domain/entities/descarga';
import { workerPool } from '../../shared/utils/workerPool';
import { descargasRepository } from '../../interfaces/controllers/descargas.controller';
import { EstadoDescarga } from '../../shared/enums/index';
import { ErrorDescarga } from '../../domain/errors/index';

export class ReintentarDescargaUseCase {
  async ejecutar(id: string): Promise<Descarga> {
    const descarga = descargasRepository.get(id);
    if (!descarga) {
      throw new ErrorDescarga(`No se encontró la descarga con ID: ${id}`, 'NOT_FOUND');
    }

    if (descarga.estado !== EstadoDescarga.FALLIDA) {
      throw new ErrorDescarga('Solo se pueden reintentar descargas en estado FALLIDA', 'BAD_REQUEST');
    }

    descarga.estado = EstadoDescarga.PENDIENTE;
    descarga.actualizarProgreso(0);

    workerPool.enqueue({
      id: descarga.id,
      url: descarga.url.valor,
      tipo: descarga.tipo as 'http' | 'ftp' | 'mock',
      maxReintentos: 3
    }).catch(() => {});

    return descarga;
  }
}