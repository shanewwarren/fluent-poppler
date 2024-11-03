import { exec } from "node:child_process";
import fs from "node:fs/promises";
import {
	type Mock,
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import {
	PDFTOPPM_EXECUTABLE_NAME,
	getPopplerPath,
	setPopplerPath,
} from "../src/capabilities";

// Mock dependencies
vi.mock("fs/promises", () => ({
	default: {
		access: vi.fn(),
	},
}));

vi.mock("child_process", () => ({
	exec: vi.fn((cmd, callback) => {
		callback(null, { stdout: "", stderr: "" });
	}),
}));

describe("Poppler Capabilities", () => {
	const mockExec = exec as unknown as Mock;
	const mockAccess = fs.access as Mock;
	const originalEnv = process.env;

	beforeEach(() => {
		// Reset process.env before each test
		process.env = { ...originalEnv };
		// Clear console mocks
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		// Reset all mocks
		vi.clearAllMocks();
		// Reset process.env
		process.env = originalEnv;
		// Reset cached path
		setPopplerPath(undefined as unknown as string);
	});

	describe("getPopplerPath", () => {
		it("should return cached path if available", async () => {
			const cachedPath = "/cached/path/to/pdftoppm";
			setPopplerPath(cachedPath);

			const result = await getPopplerPath(PDFTOPPM_EXECUTABLE_NAME);

			expect(result).toBe(`${cachedPath}/${PDFTOPPM_EXECUTABLE_NAME}`);
			expect(mockExec).not.toHaveBeenCalled();
			expect(mockAccess).not.toHaveBeenCalled();
		});

		it("should use POPPLER_PATH environment variable if set and valid", async () => {
			const envPath = "/env/path/to/pdftoppm";
			process.env.POPPLER_PATH = envPath;
			mockAccess.mockResolvedValueOnce(undefined);

			const result = await getPopplerPath(PDFTOPPM_EXECUTABLE_NAME);

			expect(result).toBe(`${envPath}/${PDFTOPPM_EXECUTABLE_NAME}`);
			expect(mockAccess).toHaveBeenCalledWith(
				`${envPath}/${PDFTOPPM_EXECUTABLE_NAME}`,
			);
			expect(mockExec).not.toHaveBeenCalled();
		});

		it("should fall back to PATH search if POPPLER_PATH is invalid", async () => {
			const envPath = "/invalid/path";
			const systemPath = "/system/path/to/pdftoppm/pdftoppm";
			process.env.POPPLER_PATH = envPath;

			mockAccess.mockRejectedValueOnce(new Error("File not found"));
			mockExec.mockImplementationOnce((cmd, callback) => {
				callback(null, { stdout: systemPath, stderr: "" });
			});

			const result = await getPopplerPath(PDFTOPPM_EXECUTABLE_NAME);

			expect(result).toBe(systemPath);
			expect(mockAccess).toHaveBeenCalledWith(
				`${envPath}/${PDFTOPPM_EXECUTABLE_NAME}`,
			);
			expect(mockExec).toHaveBeenCalledWith(
				"which pdftoppm",
				expect.any(Function),
			);
		});

		it("should return undefined if pdftoppm is not found anywhere", async () => {
			mockAccess.mockRejectedValueOnce(new Error("File not found"));
			mockExec.mockImplementationOnce((cmd, callback) => {
				callback(new Error("Command failed"), {
					stdout: "",
					stderr: "not found",
				});
			});

			const result = await getPopplerPath(PDFTOPPM_EXECUTABLE_NAME);

			expect(result).toBeUndefined();
			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining("Error: pdftoppm not found in PATH"),
			);
		});
	});
});
