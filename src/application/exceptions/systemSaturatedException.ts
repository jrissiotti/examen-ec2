export class SystemSaturatedException extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'SystemSaturatedException';
  }
}