import { IDescargable } from '../interfaces/iDescargable';
import { ErrorTimeout, ErrorMaxReintentos, ErrorNotFound } from '../errors/index';

export abstract class DescargadorBase implements IDescargable {
  protected readonly timeoutMs = 5000;
  protected readonly backoffBaseMs = 1000;
  protected progreso = 0;
  protected cancelado = false;

  // Método abstracto obligatorio requerido por el enunciado
  public abstract descargar(url: string): Promise<Buffer>;

  public cancelar(): void {
    this.cancelado = true;
  }

  public getProgreso(): number {
    return this.progreso;
  }

  // Se vuelve público para cumplir con la reutilización obligatoria
  public async ejecutarConReintento<T>(
    fn: () => Promise<T>,
    maxIntentos: number = 3
  ): Promise<T> {
    let ultimoError: any;

    for (let intento = 1; intento <= maxIntentos; intento++) {
      let timeoutId: NodeJS.Timeout | undefined;

      try {
        if (this.cancelado) {
          throw new Error('Descarga cancelada');
        }

        const promesaTimeout = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new ErrorTimeout()), this.timeoutMs);
        });

        const resultado = await Promise.race([
          fn().then(res => { if (timeoutId) clearTimeout(timeoutId); return res; }),
          promesaTimeout
        ]);

        return resultado;
      } catch (error: any) {
        if (timeoutId) clearTimeout(timeoutId);
        ultimoError = error;

        if (error instanceof ErrorNotFound) {
          throw error;
        }

        if (intento < maxIntentos) {
          // Backoff exponencial exacto: 1000ms * 2^(intento-1)
          const delay = this.backoffBaseMs * Math.pow(2, intento - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }

    throw new ErrorMaxReintentos(maxIntentos);
  }

  protected validarUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}