import { Request, Response, NextFunction } from 'express';
import { IniciarDescargaUseCase } from '../../application/descargas/iniciarDercargaUseCase';
import { ObtenerEstadoUseCase } from '../../application/descargas/consultarEstadoUseCase';
import { ReintentarDescargaUseCase } from '../../application/descargas/reintentarDescargaUseCase';
import { ListarDescargasUseCase } from '../../application/descargas/listarDescargasUseCase';
import { EstadoDescarga } from '../../shared/enums/index';
import { NotFoundException } from '../../application/exceptions/notFoundException';
import { InvalidStateException } from '../../application/exceptions/invalidStateException';
import { SystemSaturatedException } from '../../application/exceptions/systemSaturatedException';

class MemoryRepository {
  private items = new Map<string, any>();
  save(item: any) { this.items.set(item.id, item); }
  get(id: string) { return this.items.get(id); }
  getAll() { return Array.from(this.items.values()); }
}
export const descargasRepository = new MemoryRepository();

// Instanciamos los Casos de Uso
const iniciarDescargaUC = new IniciarDescargaUseCase();
const obtenerEstadoUC = new ObtenerEstadoUseCase();
const reintentarDescargaUC = new ReintentarDescargaUseCase();
const listarDescargasUC = new ListarDescargasUseCase();

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

    const descarga = await iniciarDescargaUC.ejecutar({ url, tipo, maxReintentos });

    res.status(201).json({
      id: descarga.id,
      url: descarga.url, 
      tipo: descarga.tipo,
      estado: descarga.estado,
      mensaje: 'Descarga encolada'
    });
  } catch (error) {
    // Si el pool está saturado, respondemos con 503 Service Unavailable
    if (error instanceof SystemSaturatedException) {
      res.status(503).json({ message: error.message });
      return;
    }
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

    const descarga = obtenerEstadoUC.ejecutar(id);

    res.json({
      id: descarga.id,
      url: descarga.url,
      tipo: descarga.tipo,
      estado: descarga.estado,
      progreso: descarga.progreso ?? 0,
      intentos: descarga.intentos ?? 0
    });
  } catch (error) {
    if (error instanceof NotFoundException) {
      res.status(404).json({ message: error.message });
      return;
    }
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
    const todas = listarDescargasUC.ejecutar();

    res.json({
      descargas: todas.map(d => ({
        id: d.id,
        url: d.url,
        tipo: d.tipo,
        estado: d.estado,
        progreso: d.progreso ?? 0,    
        intentos: d.intentos ?? 0      
      })),
      total: todas.length,
      completadas: todas.filter(d => d.estado === EstadoDescarga.COMPLETADA).length,
      pendientes: todas.filter(d => d.estado === EstadoDescarga.PENDIENTE || d.estado === EstadoDescarga.EN_PROGRESO).length,
      fallidas: todas.filter(d => d.estado === EstadoDescarga.FALLIDA).length
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

    const descarga = await reintentarDescargaUC.ejecutar(id);

    res.json({
      id: descarga.id,
      estado: descarga.estado,
      mensaje: 'Descarga reencolada'
    });
  } catch (error) {
    // Si la descarga no existe, devolvemos 404
    if (error instanceof NotFoundException) {
      res.status(404).json({ message: error.message });
      return;
    }
    // Si la descarga no está fallida, devolvemos 400 Bad Request
    if (error instanceof InvalidStateException) {
      res.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
};