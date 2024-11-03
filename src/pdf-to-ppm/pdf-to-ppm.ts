import { spawn } from "node:child_process";
import { PDFTOPPM_EXECUTABLE_NAME, getPopplerPath } from "../capabilities";

import { access } from "node:fs/promises";
import { basename, dirname, isAbsolute, resolve } from "node:path";
import { PdfToPpmBase } from "./base";
import type { IConvertable } from "./types";

const OUTPUT_PREFIX_DEFAULT = "output";

/**
 * Check if the parent directory of a given path exists
 * @param path - The path to check
 * @returns Promise<boolean> - True if the parent directory exists, false otherwise
 */
export const parentDirectoryExists = async (path: string): Promise<boolean> => {
	if (basename(path) === path) {
		return true;
	}

	const absolutePath = isAbsolute(path) ? path : resolve(path);
	const parentDirectory = dirname(absolutePath);
	const exists = await access(parentDirectory)
		.then(() => true)
		.catch(() => false);
	if (!exists) {
		throw new Error(`Output directory ${parentDirectory} does not exist`);
	}

	return exists;
};

/**
 * Pdftoppm converts Portable Document Format (PDF) files to color image files in Portable Pixmap (PPM) format, grayscale image files in Portable Graymap (PGM) format, or monochrome image files in Portable Bitmap (PBM) format.
 * Default output prefix is "output"
 */
export class PdfToPpm extends PdfToPpmBase implements IConvertable<string[]> {
	protected _outputPrefix: string = OUTPUT_PREFIX_DEFAULT;

	public outputPrefix(outputPrefix: string): this {
		this._outputPrefix = outputPrefix;
		return this;
	}

	/**
	 * Sets the first page to be converted
	 * @param page - Page number to start from (must be >= 1)
	 * @throws {Error} If page number is less than 1
	 */
	public firstPage(page: number): this {
		if (page < 1) throw new Error("First page must be >= 1");
		this._args.push("-f", page.toString());
		return this;
	}

	/**
	 * Sets the last page to be converted
	 * @param page - Page number to end at (must be >= 1)
	 * @throws {Error} If page number is less than 1
	 */
	public lastPage(page: number): this {
		if (page < 1) throw new Error("Last page must be >= 1");
		this._args.push("-l", page.toString());
		return this;
	}

	private async build(): Promise<string[]> {
		if (!this._input) {
			throw new Error("Input not set");
		}

		const inputPath = Buffer.isBuffer(this._input) ? "-" : this._input;
		if (!inputPath) {
			throw new Error("PDF file path is required");
		}

		// ensure outputPrefix path is exists
		if (this._outputPrefix) {
			const exists = await parentDirectoryExists(this._outputPrefix);
			if (!exists) {
				throw new Error(
					`Output directory ${this._outputPrefix} does not exist`,
				);
			}
		}

		return [...this._args, inputPath, this._outputPrefix];
	}

	/**
	 * Execute the conversion
	 * @param input - Path to the input PDF file or Buffer
	 * @param outputPrefix - Optional output prefix for files. If omitted, output is returned as buffer
	 * @returns Promise resolving to Buffer if no outputPrefix is provided, void otherwise
	 * @throws {Error} If pdftoppm executable is not found or execution fails
	 */
	public async convert(): Promise<string[]> {
		const executablePath = await getPopplerPath(PDFTOPPM_EXECUTABLE_NAME);
		if (!executablePath) {
			throw new Error(
				"pdftoppm executable not found. Please install poppler-utils or set POPPLER_PATH.",
			);
		}

		const args = await this.build();
		return new Promise((resolve, reject) => {
			const process = spawn(executablePath, args);

			// If input is Buffer, pipe it to stdin
			if (Buffer.isBuffer(this._input)) {
				process.stdin.write(this._input);
				process.stdin.end();
			}

			// Collect error messages
			const outputLines: string[] = [];
			process.stderr.on("data", (data: Buffer) => {
				outputLines.push(data.toString());
			});

			process.on("error", (error: Error) => {
				reject(new Error(`Failed to spawn process: ${error.message}`));
			});

			process.on("close", (code: number) => {
				if (code !== 0) {
					reject(
						new Error(
							`Process exited with code ${code}: ${outputLines.join("")}`,
						),
					);
					return;
				}

				// parse the file names
				const structuredOutput = outputLines.map((line) => {
					const [page, total, fileName] = line.split(" ");
					return {
						page,
						total,
						fileName,
					};
				});

				resolve(structuredOutput.map((item) => item.fileName));
			});
		});
	}
}
