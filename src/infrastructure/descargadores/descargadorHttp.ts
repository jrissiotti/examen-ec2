import axios from 'axios';
import { DescargadorBase } from '../../domain/abstract/descargadorBase';
import { ErrorTimeout, ErrorNotFound, ErrorServidor } from '../../domain/errors/index';

// REPARADO: Se agregó la 'r' que faltaba en DescargadorHttp
export class DescargadorHttp extends DescargadorBase {

  async descargar(url: string): Promise<Buffer> {
    return this.ejecutarConReintento(async () => {
      try {
        this.progreso = 5;
        
        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: this.timeoutMs,
          onDownloadProgress: (progressEvent) => {
            if (progressEvent.total) {
              this.progreso = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            } else {
              this.progreso = 50;
            }
          }
        });
        
        this.progreso = 100;
        return Buffer.from(response.data);
      } catch (error: any) {
        this.progreso = 0;
        
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          throw new ErrorTimeout();
        }

        if (error.response) {
          const status = error.response.status;
          if (status === 404) {
            throw new ErrorNotFound();
          }
          if (status >= 500) {
            throw new ErrorServidor();
          }
        }

        throw new ErrorServidor();
      }
    });
  }

  cancelar(): void {
    this.cancelado = true;
  }
}