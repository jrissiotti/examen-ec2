import axios from 'axios';
import { DescargadorBase } from '../../domain/abstract/descargadorBase';
import { ErrorTimeout, ErrorNotFound, ErrorServidor } from '../../domain/errors/index';

// REPARADO: Se agregó la 'r' que faltaba en DescargadorHttp
export class DescargadorHttp extends DescargadorBase {

  async descargar(url: string): Promise<Buffer> {
    return this.ejecutarConReintento(async () => {
      try {
        this.progreso = 5; // Inicio de conexión
        
        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: this.timeoutMs, // Usamos los 5000ms heredados de la clase base
          onDownloadProgress: (progressEvent) => {
            if (progressEvent.total) {
              // Calculamos el progreso real del flujo de datos de red
              this.progreso = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            } else {
              this.progreso = 50; // Progreso estimado si no viene el header content-length
            }
          }
        });
        
        this.progreso = 100;
        return Buffer.from(response.data);
      } catch (error: any) {
        this.progreso = 0;
        
        // Si Axios falló por Timeout de red (código ECONNABORTED o timeout manual)
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          throw new ErrorTimeout();
        }

        // Si el servidor respondió con un código de estado de error (4xx, 5xx)
        if (error.response) {
          const status = error.response.status;
          if (status === 404) {
            throw new ErrorNotFound();
          }
          if (status >= 500) {
            throw new ErrorServidor();
          }
        }

        // Si es cualquier otro error de conexión de red, lo mapeamos a error de servidor genérico
        throw new ErrorServidor();
      }
    });
  }

  cancelar(): void {
    this.cancelado = true;
  }
}