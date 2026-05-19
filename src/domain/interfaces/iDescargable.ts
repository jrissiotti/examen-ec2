export interface IDescargable {
  descargar(url: string): Promise<Buffer>;
  cancelar?(): void;
  getProgreso?(): number;
}