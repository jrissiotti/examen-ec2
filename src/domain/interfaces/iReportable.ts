export interface IReportable {
  generarReporte(): {
    id: string;
    estado: string;
    intentos: number;
    tiempoTotal: number;
  };
}