import { EstadoDescarga } from '../../shared/enums';
import { IReportable } from '../interfaces/iReportable';
import { v4 as uuidv4 } from 'uuid';

export class Descarga implements IReportable {
  public progreso: number = 0;
  public intentos: number = 0;
  public tiempoInicio: number;
  public tiempoFin?: number;
  public data?: Buffer;
  public error?: string;

  constructor(
    public readonly id: string,
    public readonly url: string,
    public readonly tipo: string,
    public estado: EstadoDescarga = EstadoDescarga.PENDIENTE
  ) {
    this.tiempoInicio = Date.now();
  }

  public iniciar(): void {
    this.estado = EstadoDescarga.EN_PROGRESO;
  }

  public actualizarProgreso(progreso: number): void {
    this.progreso = progreso;
  }

  public completar(data: Buffer): void {
    this.estado = EstadoDescarga.COMPLETADA;
    this.progreso = 100;
    this.data = data;
    this.tiempoFin = Date.now();
  }

  public fallar(error: string): void {
    this.estado = EstadoDescarga.FALLIDA;
    this.error = error;
    this.tiempoFin = Date.now();
  }

  public generarReporte() {
    return {
      id: this.id,
      estado: this.estado,
      intentos: this.intentos,
      tiempoTotal: (this.tiempoFin || Date.now()) - this.tiempoInicio
    };
  }

  public static generarId(): string {
    return uuidv4();
  }
}