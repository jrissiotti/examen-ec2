export class InvalidStateException extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'InvalidStateException';
  }
}