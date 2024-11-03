import { exec } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import util from "node:util";

const execPromise = util.promisify(exec);

interface Cache {
	popplerPath?: string;
}

const cache: Cache = {};
export const PDFTOPPM_EXECUTABLE_NAME = "pdftoppm";
export const PDFINFO_EXECUTABLE_NAME = "pdfinfo";

const POPPLER_ENV_VAR_NAME = "POPPLER_PATH";

/**
 * Set the path to the Poppler executable
 * @param path - The path to the Poppler executable
 */
export const setPopplerPath = (path: string) => {
	cache.popplerPath = path;
};

/**
 * Check for pdftoppm availability
 *
 * If the PDFTOPPM_PATH environment variable is set, try to use it.
 * If it is unset or incorrect, try to find pdftoppm in the PATH instead.
 *
 * @method getPopplerPath
 * @returns {Promise<string>} Promise resolving with the path to pdftoppm or an empty string if not found
 * @private
 */
export const getPopplerPath = async (
	executableName:
		| typeof PDFTOPPM_EXECUTABLE_NAME
		| typeof PDFINFO_EXECUTABLE_NAME,
): Promise<string | undefined> => {
	if (cache.popplerPath) {
		return path.join(cache.popplerPath, executableName);
	}

	const envPath = process.env[POPPLER_ENV_VAR_NAME];
	if (envPath) {
		const executablePath = path.join(envPath, executableName);
		try {
			await fs.access(executablePath);
			cache.popplerPath = envPath;
			return executablePath;
		} catch (error) {
			console.warn(
				`Warning: ${POPPLER_ENV_VAR_NAME} is set but the file ${executableName} was not found at: ${executablePath}`,
			);
		}
	}

	try {
		const { stdout } = await execPromise(`which ${executableName}`);
		const fullpath = stdout.trim();
		cache.popplerPath = path.dirname(fullpath);
		return fullpath;
	} catch (error) {
		console.error(`Error: ${executableName} not found in PATH`);
		cache.popplerPath = undefined;
		return undefined;
	}
};
