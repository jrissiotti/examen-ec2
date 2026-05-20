import { DescargadorBase } from '../../domain/abstract/descargadorBase';

export class DescargadorMock extends DescargadorBase {

  async descargar(url: string): Promise<Buffer> {
    return this.ejecutarConReintento(async () => {
      this.progreso = 30;
      await new Promise(resolve => setTimeout(resolve, 300));
      
      this.progreso = 70;
      await new Promise(resolve => setTimeout(resolve, 300));
      
      this.progreso = 100;
      return Buffer.from(`¡Mock exitoso! ${url} - ${new Date().toISOString()}`);
    });
  }

  cancelar(): void {
    this.cancelado = true;
  }
}