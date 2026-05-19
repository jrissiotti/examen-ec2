import { Request, Response, NextFunction } from 'express';
import { Descarga } from '../../domain/entities/descarga';
import { workerPool } from '../../shared/utils/workerPool';

export const descargasRepository = new Map<string, Descarga>();

/**
 * POST /api/descargas
 */
export const crearDescarga = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { url, tipo, maxReintentos = 3 } = req.body;

    // TODO: Student implementation
    // - Validate URL -> Se valida automáticamente al instanciar el Value Object dentro de Descarga
    // - Create Descarga entity
    const descarga = new Descarga(url, tipo);
    descargasRepository.set(descarga.id, descarga);

    workerPool.enqueue({
      id: descarga.id,
      url: descarga.url.valor,
      tipo: descarga.tipo as 'http' | 'ftp' | 'mock',
      maxReintentos
    }).catch(err => console.error(`Error encolando tarea ${descarga.id}:`, err));

    res.status(201).json({
      id: descarga.id,
      url,
      tipo,
      estado: descarga.estado,
      mensaje: 'Descarga encolada'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/descargas/:id/estado
 */
export const obtenerEstadoDescarga = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // TODO: Student implementation
    // - Query repository
    const descarga = descargasRepository.get(id);

    if (!descarga) {
      res.status(404).json({ error: 'Descarga no encontrada' });
      return;
    }

    res.json({
      id: descarga.id,
      estado: descarga.estado,
      progreso: descarga.progreso,
      intentos: descarga.intentos
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/descargas
 */
export const listarDescargas = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // TODO: Student implementation
    // - Query repository
    const lista = Array.from(descargasRepository.values());

    res.json({
      descargas: lista.map(d => ({
        id: d.id,
        url: d.url.valor,
        tipo: d.tipo,
        estado: d.estado,
        progreso: d.progreso,
        intentos: d.intentos
      })),
      total: lista.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/descargas/:id/reintentar
 */
export const reintentarDescarga = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // TODO: Student implementation
    // - Validate state
    const descarga = descargasRepository.get(id);

    if (!descarga) {
      res.status(404).json({ error: 'Descarga no encontrada' });
      return;
    }

    // - Re-enqueue
    descarga.actualizarProgreso(0);
    
    workerPool.enqueue({
      id: descarga.id,
      url: descarga.url.valor,
      tipo: descarga.tipo as 'http' | 'ftp' | 'mock',
      maxReintentos: 3
    }).catch(err => console.error(err));

    res.json({
      id: descarga.id,
      estado: 'REINTENTANDO',
      mensaje: 'Descarga reencolada'
    });
  } catch (error) {
    next(error);
  }
};
