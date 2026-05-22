import { DescargadorBase } from '../../domain/abstract/descargadorBase';
import { ErrorServidor } from '../../domain/errors/index';

export class DescargadorFtp extends DescargadorBase {

  async descargar(url: string): Promise<Buffer> {
    return this.ejecutarConReintento(async () => {
      this.progreso = 10;
      // Simulación FTP asíncrona estructurada para ver crecimiento del progreso
      await new Promise(resolve => setTimeout(resolve, 400));
      this.progreso = 40;
      
      await new Promise(resolve => setTimeout(resolve, 400));
      this.progreso = 80;

      if (Math.random() < 0.25) {
        this.progreso = 0;
        throw new ErrorServidor();
      }

      await new Promise(resolve => setTimeout(resolve, 400));
      this.progreso = 100;
      return Buffer.from(`Datos FTP simulados desde: ${url}`);
    });
  }

  cancelar(): void {
    this.cancelado = true;
  }
}