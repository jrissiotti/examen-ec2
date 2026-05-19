import axios from 'axios';
import { DescargadorBase } from '../../domain/abstract/descargadorBase';
import { IDescargable } from '../../domain/interfaces/iDescargable';
import { ErrorTimeout, ErrorNotFound, ErrorServidor } from '../../domain/errors/index';

export class DescargadorHttp extends DescargadorBase implements IDescargable {

  async descargar(url: string): Promise<Buffer> {
    return this.ejecutarConReintento(async () => {
      try {
        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: this.timeoutMs // Usamos los 5000ms heredados de la clase base
        });
        return Buffer.from(response.data);
      } catch (error: any) {
        // Si Axios falló por Timeout de red (código ECONNABORTED o timeout manual)
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          throw new ErrorTimeout();
        }

        // Si el servidor respondió con un código de estado de error (4xx, 5xx)
        if (error.response) {
          const status = error.response.status;
          if (status === 404) {
            throw new ErrorNotFound(); // ✅ Corregido: sin pasarle 'url' para que coincida con tu constructor
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

  // Cumplimos con los métodos exigidos por la interfaz IDescargable
  cancelar(): void {
    // Implementación requerida por la interfaz
  }

  getProgreso(): number {
    return 0; // El progreso real lo maneja el hilo principal mediante el worker pool
  }
}