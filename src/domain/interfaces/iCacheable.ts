export interface ICacheable {
  obtenerClaveCache(): string;
  guardarEnCache(data: Buffer): void;
  recuperarDeCache(): Buffer | null;
}