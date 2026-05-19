import { DescargadorBase } from '../abstract/descargadorBase';
import { DescargadorHttp } from '../../infrastructure/descargadores/descargadorHttp';
import { DescargadorFtp } from '../../infrastructure/descargadores/descargadorFtp';
import { DescargadorMock } from '../../infrastructure/descargadores/descargadorMock';
import { ErrorTipoInvalido } from '../errors/index';
import { TipoDescargador } from '../../shared/enums/index';

export class DescargadorFactory {
  static crear(tipo: string): DescargadorBase {
    const tipoLower = tipo.toLowerCase();

    switch (tipoLower) {
      case TipoDescargador.HTTP:
        return new DescargadorHttp();
      case TipoDescargador.FTP:
        return new DescargadorFtp();
      case TipoDescargador.MOCK:
        return new DescargadorMock();
      default:
        throw new ErrorTipoInvalido(tipo);
    }
  }
}