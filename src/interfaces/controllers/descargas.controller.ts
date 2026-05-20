import { Request, Response, NextFunction } from 'express';
import { IniciarDescargaUseCase } from '../../application/descargas/iniciarDercargaUseCase';
import { ObtenerEstadoUseCase } from '../../application/descargas/consultarEstadoUseCase';
import { ReintentarDescargaUseCase } from '../../application/descargas/reintentarDescargaUseCase';
import { EstadoDescarga } from '../../shared/enums/index';

class MemoryRepository {
  private items = new Map<string, any>();
  save(item: any) { this.items.set(item.id, item); }
  get(id: string) { return this.items.get(id); }
  getAll() { return Array.from(this.items.values()); }
}
export const descargasRepository = new MemoryRepository();

// Instanciamos los Casos de Uso a application
const iniciarDescargaUC = new IniciarDescargaUseCase();
const obtenerEstadoUC = new ObtenerEstadoUseCase();
const reintentarDescargaUC = new ReintentarDescargaUseCase();

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

    // Delegamos la lógica de negocio al caso de uso correspondiente
    const descarga = await iniciarDescargaUC.ejecutar({ url, tipo, maxReintentos });

    res.status(201).json({
      id: descarga.id,
      url: descarga.url, 
      tipo: descarga.tipo,
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

    // Invocamos el caso de uso para obtener la entidad del dominio
    const descarga = obtenerEstadoUC.ejecutar(id);

    if (!descarga) {
      res.status(404).json({ message: 'Descarga no encontrada' });
      return;
    }

    res.json({
      id: descarga.id,
      url: descarga.url,
      tipo: descarga.tipo,
      estado: descarga.estado,
      progreso: descarga.progreso ?? 0,
      intentos: descarga.intentos ?? 0
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
    const todas = descargasRepository.getAll();

    // Mapeamos los datos exponiendo de forma explícita el progreso y los intentos de la entidad
    res.json({
      descargas: todas.map(d => ({
        id: d.id,
        url: d.url,
        tipo: d.tipo,
        estado: d.estado,
        progreso: d.progreso ?? 0,    // Muestra el porcentaje en tiempo real (0-100%)
        intentos: d.intentos ?? 0      // Muestra cuántas veces ha pasado por el pool o reintentos
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

    // Invocamos el caso de uso para resetear el estado y volver a meterlo al pool
    const descarga = await reintentarDescargaUC.ejecutar(id);

    res.json({
      id: descarga.id,
      estado: descarga.estado,
      mensaje: 'Descarga reencolada'
    });
  } catch (error) {
    next(error);
  }
};