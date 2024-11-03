export interface IConvertable<T = string[], R = void> {
	convert(opts?: R): Promise<T>;
}
