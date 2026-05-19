import { DescargadorBase } from '../../domain/abstract/descargadorBase';
import { IDescargable } from '../../domain/interfaces/iDescargable';
import { ErrorServidor } from '../../domain/errors/index';

export class DescargadorFtp extends DescargadorBase implements IDescargable {

  async descargar(url: string): Promise<Buffer> {
    return this.ejecutarConReintento(async () => {
      // Simulación FTP asíncrona
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Simular fallo aleatorio del 25% exigido por el enunciado
      if (Math.random() < 0.25) {
        throw new ErrorServidor();
      }

      return Buffer.from(`Datos FTP simulados desde: ${url}`);
    });
  }

  cancelar(): void {}
  getProgreso(): number { return 0; }
}