type JPEGOptions = {
	quality?: number;
	progressive?: boolean;
	optimize?: boolean;
};

export class PdfToPpmBase {
	protected _input: string | Buffer | undefined;
	protected _args: string[];
	protected _hasOutputFormat: boolean;

	constructor(input?: string | Buffer) {
		// -progress is required for pdftoppm to return the file names
		this._args = ["-progress"];
		this._input = input;
		this._hasOutputFormat = false;
	}

	/**
	 * Sets the input PDF file or Buffer
	 * @param input - Path to the input PDF file or Buffer
	 */
	public input(input: string | Buffer): this {
		this._input = input;
		return this;
	}

	/**
	 * Sets the resolution in DPI (dots per inch)
	 * @param dpi - Resolution value (default is 150)
	 * @throws {Error} If DPI is less than or equal to 0
	 */
	public resolution(dpi: number): this {
		if (dpi <= 0) throw new Error("DPI must be > 0");
		this._args.push("-r", dpi.toString());
		return this;
	}

	/**
	 * Sets separate X and Y resolutions in DPI
	 * @param x - X-axis resolution
	 * @param y - Y-axis resolution
	 * @throws {Error} If either resolution is less than or equal to 0
	 */
	public resolutionXY(x: number, y: number): this {
		if (x <= 0 || y <= 0) throw new Error("Resolution must be > 0");
		this._args.push("-rx", x.toString(), "-ry", y.toString());
		return this;
	}

	/**
	 * Scales each page to fit within a square pixel box
	 * @param size - Size of the box in pixels
	 * @throws {Error} If size is less than or equal to 0
	 */
	public scaleTo(size: number): this {
		if (size <= 0) throw new Error("Scale size must be > 0");
		this._args.push("-scale-to", size.toString());
		return this;
	}

	/**
	 * Scales each page to specific dimensions
	 * @param x - Width in pixels (optional)
	 * @param y - Height in pixels (optional)
	 * @throws {Error} If both dimensions are 0 or negative
	 */
	public scaleToXY(x: number, y: number): this {
		if (x <= 0 && y <= 0) throw new Error("At least one dimension must be > 0");
		if (x > 0) this._args.push("-scale-to-x", x.toString());
		if (y > 0) this._args.push("-scale-to-y", y.toString());
		return this;
	}

	/**
	 * Sets the crop area
	 * @param x - X-coordinate of top left corner
	 * @param y - Y-coordinate of top left corner
	 * @param width - Width of crop area
	 * @param height - Height of crop area
	 * @throws {Error} If width or height is negative
	 */
	public crop(x: number, y: number, width: number, height: number): this {
		if (width < 0 || height < 0)
			throw new Error("Width and height must be >= 0");
		this._args.push(
			"-x",
			x.toString(),
			"-y",
			y.toString(),
			"-W",
			width.toString(),
			"-H",
			height.toString(),
		);
		return this;
	}

	/**
	 * Sets a square crop area
	 * @param size - Size of the crop square in pixels
	 * @throws {Error} If size is negative
	 */
	public cropSquare(size: number): this {
		if (size < 0) throw new Error("Crop size must be >= 0");
		this._args.push("-sz", size.toString());
		return this;
	}

	/**
	 * Uses the crop box rather than media box
	 */
	public cropBox(): this {
		this._args.push("-cropbox");
		return this;
	}

	/**
	 * Generates a monochrome PBM file
	 * @throws {Error} If another output format is already set
	 */
	public monochrome(): this {
		if (this._hasOutputFormat) {
			throw new Error("Another output format is already set");
		}
		this._hasOutputFormat = true;
		this._args.push("-mono");
		return this;
	}

	/**
	 * Generates a grayscale PGM file
	 * @throws {Error} If another output format is already set
	 */
	public grayscale(): this {
		if (this._hasOutputFormat) {
			throw new Error("Another output format is already set");
		}
		this._hasOutputFormat = true;
		this._args.push("-gray");
		return this;
	}

	/**
	 * Generates a PNG file
	 * @throws {Error} If another output format is already set
	 */
	public png(): this {
		if (this._hasOutputFormat) {
			throw new Error("Another output format is already set");
		}
		this._hasOutputFormat = true;
		this._args.push("-png");
		return this;
	}

	/**
	 * Generates a JPEG file with optional compression options
	 * @param options - JPEG options (e.g., { quality: '90', progressive: 'y' })
	 * @throws {Error} If another output format is already set
	 */
	public jpeg(options?: JPEGOptions): this {
		if (this._hasOutputFormat) {
			throw new Error("Another output format is already set");
		}
		this._hasOutputFormat = true;
		this._args.push("-jpeg");

		if (options) {
			const jpegOpts: string[] = [];
			if (options.quality !== undefined) {
				if (options.quality < 0 || options.quality > 100) {
					throw new Error("JPEG quality must be between 0 and 100");
				}
				jpegOpts.push(`quality=${options.quality}`);
			}

			if (options.progressive !== undefined) {
				jpegOpts.push(`progressive=${options.progressive ? "y" : "n"}`);
			}

			if (options.optimize !== undefined) {
				jpegOpts.push(`optimize=${options.optimize ? "y" : "n"}`);
			}

			this._args.push("-jpegopt", jpegOpts.join(","));
		}
		return this;
	}

	/**
	 * Generates a CMYK JPEG file
	 * @throws {Error} If another output format is already set
	 */
	public jpegCmyk(): this {
		if (this._hasOutputFormat) {
			throw new Error("Another output format is already set");
		}
		this._hasOutputFormat = true;
		this._args.push("-jpegcmyk");
		return this;
	}

	/**
	 * Generates a TIFF file with optional compression
	 * @param compression - Compression method
	 * @throws {Error} If another output format is already set
	 */
	public tiff(
		compression?: "none" | "packbits" | "jpeg" | "lzw" | "deflate",
	): this {
		if (this._hasOutputFormat) {
			throw new Error("Another output format is already set");
		}
		this._hasOutputFormat = true;
		this._args.push("-tiff");
		if (compression) {
			this._args.push("-tiffcompression", compression);
		}
		return this;
	}

	/**
	 * Sets the ICC color profile to use as the display profile
	 * @param profile - Path to ICC profile
	 */
	public displayProfile(profile: string): this {
		this._args.push("-displayprofile", profile);
		return this;
	}

	/**
	 * Sets the default ICC color profiles
	 * @param options - Object containing paths to ICC profiles
	 */
	public defaultProfiles(options: {
		gray?: string;
		rgb?: string;
		cmyk?: string;
	}): this {
		if (options.gray) this._args.push("-defaultgrayprofile", options.gray);
		if (options.rgb) this._args.push("-defaultrgbprofile", options.rgb);
		if (options.cmyk) this._args.push("-defaultcmykprofile", options.cmyk);
		return this;
	}

	/**
	 * Sets the separator between filename and page number
	 * @param separator - Single character separator (default is '-')
	 * @throws {Error} If separator is not a single character
	 */
	public pageSeparator(separator: string): this {
		if (separator.length !== 1) {
			throw new Error("Separator must be a single character");
		}
		this._args.push("-sep", separator);
		return this;
	}

	/**
	 * Forces page number even if there is only one page
	 */
	public forcePageNumber(): this {
		this._args.push("-forcenum");
		return this;
	}

	/**
	 * Enables overprint
	 */
	public overprint(): this {
		this._args.push("-overprint");
		return this;
	}

	/**
	 * Enables or disables FreeType font rasterizer
	 * @param enabled - Whether to enable FreeType
	 */
	public freeType(enabled: boolean): this {
		this._args.push("-freetype", enabled ? "yes" : "no");
		return this;
	}

	/**
	 * Sets the thin line mode
	 * @param mode - Thin line mode (default is 'none')
	 */
	public thinLineMode(mode: "none" | "solid" | "shape"): this {
		this._args.push("-thinlinemode", mode);
		return this;
	}

	/**
	 * Sets anti-aliasing options for fonts and vectors
	 * @param font - Enable font anti-aliasing
	 * @param vector - Enable vector anti-aliasing
	 */
	public antiAliasing(font: boolean, vector: boolean): this {
		this._args.push("-aa", font ? "yes" : "no");
		this._args.push("-aaVector", vector ? "yes" : "no");
		return this;
	}

	/**
	 * Sets the owner password
	 * @param owner - Owner password
	 */
	public ownerPassword(owner: string): this {
		this._args.push("-opw", owner);
		return this;
	}

	/**
	 * Sets the user password
	 * @param user - User password
	 */
	public userPassword(user: string): this {
		this._args.push("-upw", user);
		return this;
	}
}
