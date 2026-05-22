export class MaxRetriesExceededException extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'MaxRetriesExceededException';
  }
}