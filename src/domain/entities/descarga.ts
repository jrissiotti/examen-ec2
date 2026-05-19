import { v4 as uuidv4 } from 'uuid';
import { EstadoDescarga } from '../../shared/enums/index';
import { UrlDescarga } from '../value-objects/urlDescarga';
import { ErrorDescarga, ErrorEstadoInvalido } from '../errors/index';
import { IReportable } from '../interfaces/iReportable';

export class Descarga implements IReportable {
  public readonly id: string;
  public readonly url: UrlDescarga;
  public readonly tipo: string;
  public estado: EstadoDescarga;
  public progreso: number = 0;
  public intentos: number = 0;
  public readonly fechaCreacion: Date;
  public fechaInicio?: Date;
  public fechaFin?: Date;
  public error?: string;
  public codigoError?: string;
  public data?: Buffer;

  constructor(url: string, tipo: string) {
    this.id = uuidv4();
    this.url = new UrlDescarga(url);
    this.tipo = tipo.toLowerCase();
    this.estado = EstadoDescarga.PENDIENTE;
    this.fechaCreacion = new Date();
  }

  public iniciar(): void {
    if (![EstadoDescarga.PENDIENTE, EstadoDescarga.REINTENTANDO, EstadoDescarga.FALLIDA].includes(this.estado)) {
      throw new ErrorEstadoInvalido(this.estado);
    }
    this.estado = EstadoDescarga.EN_PROGRESO;
    this.fechaInicio = new Date();
  }

  public completar(data: Buffer): void {
    this.estado = EstadoDescarga.COMPLETADA;
    this.progreso = 100;
    this.data = data;
    this.fechaFin = new Date();
  }

  public fallar(error: ErrorDescarga): void {
    this.estado = EstadoDescarga.FALLIDA;
    this.error = error.message;
    this.codigoError = error.codigo;
    this.fechaFin = new Date();
  }

  public incrementarIntento(): void {
    this.intentos++;
  }

  public actualizarProgreso(progreso: number): void {
    this.progreso = Math.max(0, Math.min(100, progreso));
  }

  public esFinalizada(): boolean {
    return [EstadoDescarga.COMPLETADA, EstadoDescarga.FALLIDA, EstadoDescarga.CANCELADA]
      .includes(this.estado);
  }

  public generarReporte() {
    return {
      id: this.id,
      estado: this.estado,
      intentos: this.intentos,
      tiempoTotal: this.fechaInicio && this.fechaFin ? this.fechaFin.getTime() - this.fechaInicio.getTime() : 0
    };
  }

  public toDTO() {
    return {
      id: this.id,
      url: this.url.valor,
      tipo: this.tipo,
      estado: this.estado,
      progreso: this.progreso,
      intentos: this.intentos,
      tiempoTranscurrido: this.fechaInicio ? Date.now() - this.fechaInicio.getTime() : 0,
      error: this.error,
      codigoError: this.codigoError
    };
  }
}