export class NotFoundException extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'NotFoundException';
  }
}