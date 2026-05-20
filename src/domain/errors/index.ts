import { CodigoError } from '../../shared/enums/index';

export class ErrorDescarga extends Error {
  constructor(
    message: string,
    public readonly codigo: string,
    public readonly intentos?: number
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ErrorTimeout extends ErrorDescarga {
  constructor() {
    super('La descarga ha excedido el tiempo máximo', CodigoError.TIMEOUT);
  }
}

export class ErrorNotFound extends ErrorDescarga {
  constructor() {
    super('Recurso no encontrado (404)', CodigoError.NOT_FOUND);
  }
}

export class ErrorServidor extends ErrorDescarga {
  constructor() {
    super('Error interno del servidor', CodigoError.SERVER_ERROR);
  }
}

export class ErrorMaxReintentos extends ErrorDescarga {
  constructor(intentos: number) {
    super(`Se alcanzó el máximo de reintentos (${intentos})`, CodigoError.MAX_RETRIES, intentos);
  }
}

export class ErrorUrlInvalida extends ErrorDescarga {
  constructor(url: string) {
    super(`URL inválida: ${url}`, CodigoError.INVALID_URL);
  }
}

export class ErrorTipoInvalido extends ErrorDescarga {
  constructor(tipo: string) {
    super(`Tipo de descargador no soportado: ${tipo}`, CodigoError.INVALID_TYPE);
  }
}

export class ErrorEstadoInvalido extends ErrorDescarga {
  constructor(estadoActual: string) {
    super(`Transición de estado inválida desde: ${estadoActual}`, CodigoError.ESTADO_INVALIDO);
  }
}