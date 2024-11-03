import { spawn } from "node:child_process";
import { PDFINFO_EXECUTABLE_NAME, getPopplerPath } from "./capabilities";

export type Information = {
	title: string;
	subject: string;
	keywords: string;
	author: string;
	creator: string;
	producer: string;
	creationDate: Date;
	modificationDate: Date;
};

export type FormType = "AcroForm" | "XFA" | "none";

export type PdfInformation = Information & {
	customMetadata: boolean;
	metadataStream: boolean;
	tagged: boolean;
	userProperties: boolean;
	suspects: boolean;
	form: FormType;
	javascript: boolean;
	pageCount: number;
	encrypted: boolean;
	pageSize: {
		width: number;
		height: number;
	};
	pageRotation: number;
	fileSize: number;
	optimized: boolean;
	pdfVersion: string;
};

/**
 * Represents possible PDF processing error types
 */
export class PdfError extends Error {
	constructor(
		message: string,
		public code: number,
	) {
		super(message);
		this.name = "PdfError";
	}
}

/**
 * Maps exit codes to their meanings
 */
const EXIT_CODES = {
	SUCCESS: 0,
	FILE_OPEN_ERROR: 1,
	OUTPUT_ERROR: 2,
	PERMISSIONS_ERROR: 3,
	OTHER_ERROR: 99,
} as const;

/**
 * Extract information from a PDF file
 */
export class PdfInfo {
	private args: string[] = [];
	private _input: Buffer | string | undefined;
	private hasIsoDates = false;
	private hasRawDates = false;

	/**
	 * Creates a new PdfInfo instance.
	 * @param input - Path to PDF file or Buffer containing PDF data
	 */
	constructor(input?: Buffer | string) {
		this._input = input;
	}

	input(input: Buffer | string): this {
		this._input = input;
		return this;
	}

	/**
	 * Specifies the first page to examine. If used with withLastPage,
	 * information for the specified range will be printed.
	 * @param page - Page number to start from
	 * @throws {Error} If page number is less than 1
	 */
	firstPage(page: number): this {
		if (page < 1) {
			throw new Error("First page must be greater than 0");
		}
		this.args.push("-f", page.toString());
		return this;
	}

	/**
	 * Specifies the last page to examine.
	 * @param page - Page number to end at
	 * @throws {Error} If page number is less than 1
	 */
	lastPage(page: number): this {
		if (page < 1) {
			throw new Error("Last page must be greater than 0");
		}
		this.args.push("-l", page.toString());
		return this;
	}

	/**
	 * Prints the page box bounding boxes: MediaBox, CropBox, BleedBox, TrimBox, and ArtBox.
	 */
	boxInfo(): this {
		this.args.push("-box");
		return this;
	}

	/**
	 * Prints document-level metadata (Metadata stream from the PDF file's Catalog object).
	 */
	metadata(): this {
		this.args.push("-meta");
		return this;
	}

	/**
	 * Prints custom and standard metadata.
	 */
	customMetadata(): this {
		this.args.push("-custom");
		return this;
	}

	/**
	 * Prints all JavaScript in the PDF.
	 */
	javaScript(): this {
		this.args.push("-js");
		return this;
	}

	/**
	 * Prints the logical document structure of a Tagged-PDF file.
	 */
	structure(): this {
		this.args.push("-struct");
		return this;
	}

	/**
	 * Prints the textual content along with the document structure of a Tagged-PDF file.
	 * Note: This operation might be slow for large PDF files.
	 * Implies -struct option.
	 */
	structureText(): this {
		this.args.push("-struct-text");
		return this;
	}

	/**
	 * Prints all URLs in the PDF (limited to URLs in Annotations).
	 */
	urls(): this {
		this.args.push("-url");
		return this;
	}

	/**
	 * Prints dates in ISO-8601 format (including time zone).
	 * @throws {Error} If raw dates format is already selected
	 */
	isoDates(): this {
		if (this.hasRawDates) {
			throw new Error("Cannot use both ISO and raw date formats");
		}
		this.hasIsoDates = true;
		this.args.push("-isodates");
		return this;
	}

	/**
	 * Prints the raw (undecoded) date strings directly from the PDF file.
	 * @throws {Error} If ISO dates format is already selected
	 */
	rawDates(): this {
		if (this.hasIsoDates) {
			throw new Error("Cannot use both ISO and raw date formats");
		}
		this.hasRawDates = true;
		this.args.push("-rawdates");
		return this;
	}

	/**
	 * Prints a list of all named destinations.
	 * If page range is specified, only destinations in that range are listed.
	 */
	destinations(): this {
		this.args.push("-dests");
		return this;
	}

	/**
	 * Sets the encoding to use for text output (defaults to "UTF-8").
	 * @param encoding - Name of the encoding to use
	 */
	encoding(encoding: string): this {
		this.args.push("-enc", encoding);
		return this;
	}

	/**
	 * Lists the available encodings.
	 */
	listEncodings(): this {
		this.args.push("-listenc");
		return this;
	}

	/**
	 * Specifies the owner password for the PDF file.
	 * This will bypass all security restrictions.
	 * @param password - Owner password
	 */
	ownerPassword(password: string): this {
		this.args.push("-opw", password);
		return this;
	}

	/**
	 * Specifies the user password for the PDF file.
	 * @param password - User password
	 */
	userPassword(password: string): this {
		this.args.push("-upw", password);
		return this;
	}

	/**
	 * Parses the output from pdfinfo command into a structured format.
	 * @private
	 */
	private parsePdfInfo(output: Buffer): PdfInformation {
		const raw = output.toString();
		const lines = raw.split("\n");
		const info: Record<string, string> = {};

		// Parse each line into key-value pairs
		for (const line of lines) {
			const match = line.match(/^([^:]+):\s*(.*)$/);
			if (match) {
				info[match[1].trim()] = match[2].trim();
			}
		}

		// Parse page size
		const pageSizeMatch = info["Page size"]?.match(/(\d+)\s*x\s*(\d+)/);

		return {
			title: info.Title || "",
			subject: info.Subject || "",
			author: info.Author || "",
			creator: info.Creator || "",
			producer: info.Producer || "",
			keywords: info.Keywords || "",
			creationDate: info.CreationDate
				? new Date(info.CreationDate)
				: new Date(),
			modificationDate: info.ModDate ? new Date(info.ModDate) : new Date(),
			customMetadata: info["Custom metadata"]?.toLowerCase() === "yes",
			metadataStream: info["Metadata stream"]?.toLowerCase() === "yes",
			pageCount: Number.parseInt(info.Pages || "0", 10),
			form: info.Form as FormType,
			tagged: info.Tagged?.toLowerCase() === "yes",
			userProperties: info.UserProperties?.toLowerCase() === "yes",
			suspects: info.Suspects?.toLowerCase() === "yes",
			javascript: info.JavaScript?.toLowerCase() === "yes",
			encrypted: info.Encrypted?.toLowerCase() === "yes",
			optimized: info.Optimized?.toLowerCase() === "yes",
			pageSize: {
				width: pageSizeMatch ? Number.parseInt(pageSizeMatch[1], 10) : 0,
				height: pageSizeMatch ? Number.parseInt(pageSizeMatch[2], 10) : 0,
			},
			pageRotation: Number.parseInt(info["Page rot"] || "0", 10),
			fileSize: Number.parseInt(
				info["File size"]?.replace(/\D/g, "") || "0",
				10,
			),
			pdfVersion: info["PDF version"] || "",
		};
	}

	private build(): string[] {
		if (!this._input) {
			throw new Error("Input not set");
		}

		const inputPath = Buffer.isBuffer(this._input) ? "-" : this._input;
		if (!inputPath) {
			throw new Error("PDF file path is required");
		}

		const finalArgs = [...this.args, inputPath];
		return finalArgs;
	}

	/**
	 * Executes the pdfinfo command with the configured options.
	 * @returns Promise that resolves with the parsed PDF information
	 * @throws {PdfError} If the poppler executable is not found
	 * @throws {PdfError} If no input is provided
	 * @throws {PdfError} If there's an error opening the PDF file
	 * @throws {PdfError} If there's an error related to PDF permissions
	 * @throws {PdfError} If there's any other processing error
	 */
	async execute(): Promise<PdfInformation> {
		const executablePath = await getPopplerPath(PDFINFO_EXECUTABLE_NAME);
		if (!executablePath) {
			throw new PdfError(
				`${PDFINFO_EXECUTABLE_NAME} executable not found. Please install poppler-utils or set POPPLER_PATH.`,
				EXIT_CODES.OTHER_ERROR,
			);
		}

		if (!this._input) {
			throw new PdfError("Input not set", EXIT_CODES.OTHER_ERROR);
		}

		const args = this.build();

		return new Promise((resolve, reject) => {
			const chunks: Buffer[] = [];
			const process = spawn(executablePath, args);

			// If input is Buffer, pipe it to stdin
			if (Buffer.isBuffer(this._input)) {
				process.stdin.write(this._input);
				process.stdin.end();
			}

			process.stdout.on("data", (chunk: Buffer) => {
				chunks.push(chunk);
			});

			const errors: string[] = [];
			process.stderr.on("data", (data: Buffer) => {
				errors.push(data.toString());
			});

			process.on("error", (error: Error) => {
				reject(
					new PdfError(
						`Failed to spawn process: ${error.message}`,
						EXIT_CODES.OTHER_ERROR,
					),
				);
			});

			process.on("close", (code: number) => {
				if (code !== EXIT_CODES.SUCCESS) {
					const errorMessage = errors.join("");

					switch (code) {
						case EXIT_CODES.FILE_OPEN_ERROR:
							reject(
								new PdfError(`Error opening PDF file: ${errorMessage}`, code),
							);
							break;

						case EXIT_CODES.OUTPUT_ERROR:
							reject(
								new PdfError(`Error writing output: ${errorMessage}`, code),
							);
							break;

						case EXIT_CODES.PERMISSIONS_ERROR:
							reject(
								new PdfError(`PDF permissions error: ${errorMessage}`, code),
							);
							break;

						default:
							reject(
								new PdfError(
									`Process failed with code ${code}: ${errorMessage}`,
									EXIT_CODES.OTHER_ERROR,
								),
							);
					}
					return;
				}

				try {
					const output = Buffer.concat(chunks);
					const pdfInfo = this.parsePdfInfo(output);
					resolve(pdfInfo);
				} catch (error) {
					reject(
						new PdfError(
							`Error parsing PDF info: ${error instanceof Error ? error.message : "Unknown error"}`,
							EXIT_CODES.OTHER_ERROR,
						),
					);
				}
			});
		});
	}
}
