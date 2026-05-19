import { ErrorUrlInvalida } from '../errors/index';

export class UrlDescarga {
  public readonly valor: string;

  constructor(url: string) {
    if (!this.esUrlValida(url)) {
      throw new ErrorUrlInvalida(url);
    }
    this.valor = url;
  }

  private esUrlValida(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}