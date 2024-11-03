import { spawn } from "node:child_process";
import { PDFTOPPM_EXECUTABLE_NAME, getPopplerPath } from "../capabilities";
import { PdfToPpmBase } from "./base";
import type { IConvertable } from "./types";

/**
 * Convert a PDF file to a stream image buffer
 */
export class StreamPdfToPpm
	extends PdfToPpmBase
	implements IConvertable<Buffer, number>
{
	constructor(input?: string | Buffer) {
		super(input);
		// -singlefile is required for pdftoppm to return a single file stream
		this._args.push("-singlefile");
	}

	private async build(page: number): Promise<string[]> {
		if (!this._input) {
			throw new Error("Input not set");
		}

		const inputPath = Buffer.isBuffer(this._input) ? "-" : this._input;
		if (!inputPath) {
			throw new Error("PDF file path is required");
		}

		return [...this._args, "-f", page.toString(), inputPath];
	}

	/**
	 * Execute the conversion
	 * @param input - Path to the input PDF file or Buffer
	 * @param outputPrefix - Optional output prefix for files. If omitted, output is returned as buffer
	 * @returns Promise resolving to Buffer if no outputPrefix is provided, void otherwise
	 * @throws {Error} If pdftoppm executable is not found or execution fails
	 */
	public async convert(page: number): Promise<Buffer> {
		const executablePath = await getPopplerPath(PDFTOPPM_EXECUTABLE_NAME);
		if (!executablePath) {
			throw new Error(
				"pdftoppm executable not found. Please install poppler-utils or set POPPLER_PATH.",
			);
		}

		const args = await this.build(page);
		return new Promise((resolve, reject) => {
			const process = spawn(executablePath, args);

			// If input is Buffer, pipe it to stdin
			if (Buffer.isBuffer(this._input)) {
				process.stdin.write(this._input);
				process.stdin.end();
			}

			const chunks: Buffer[] = [];
			process.stdout.on("data", (chunk: Buffer) => {
				chunks.push(chunk);
			});

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

				resolve(Buffer.concat(chunks));
			});
		});
	}
}
