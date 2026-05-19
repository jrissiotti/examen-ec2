import { DescargadorBase } from '../../domain/abstract/descargadorBase';
import { IDescargable } from '../../domain/interfaces/iDescargable';

export class DescargadorMock extends DescargadorBase implements IDescargable {

  async descargar(url: string): Promise<Buffer> {
    return this.ejecutarConReintento(async () => {
      await new Promise(resolve => setTimeout(resolve, 600));
      return Buffer.from(`¡Mock exitoso! ${url} - ${new Date().toISOString()}`);
    });
  }

  cancelar(): void {}
  getProgreso(): number { return 0; }
}