import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { PdfError, PdfInfo } from "../src/pdf-info";

describe("PdfInfo", () => {
	const testPdfPath = path.join(__dirname, "../assets", "tc-123.pdf");
	let pdfInfo: PdfInfo;

	beforeEach(() => {
		pdfInfo = new PdfInfo(testPdfPath);
	});

	describe("constructor", () => {
		it("should create instance with file path", () => {
			expect(pdfInfo).toBeInstanceOf(PdfInfo);
		});

		it("should create instance with buffer", () => {
			const buffer = Buffer.from("dummy pdf content");
			const instance = new PdfInfo(buffer);
			expect(instance).toBeInstanceOf(PdfInfo);
		});
	});

	describe("method chaining", () => {
		it("should allow method chaining for configuration", () => {
			const instance = pdfInfo.firstPage(1).lastPage(5).boxInfo().isoDates();

			expect(instance).toBe(pdfInfo);
		});
	});

	describe("validation", () => {
		it("should throw error for invalid first page", () => {
			expect(() => pdfInfo.firstPage(0)).toThrow(
				"First page must be greater than 0",
			);
		});

		it("should throw error for invalid last page", () => {
			expect(() => pdfInfo.lastPage(0)).toThrow(
				"Last page must be greater than 0",
			);
		});

		it("should throw error when using both ISO and raw dates", () => {
			pdfInfo.isoDates();
			expect(() => pdfInfo.rawDates()).toThrow(
				"Cannot use both ISO and raw date formats",
			);
		});
	});

	describe("execute", () => {
		it("should successfully parse PDF information", async () => {
			const info = await pdfInfo.execute();

			expect(info).toMatchObject({
				pageCount: expect.any(Number),
				pageSize: {
					width: expect.any(Number),
					height: expect.any(Number),
				},
				pdfVersion: expect.any(String),
			});
		});

		it("should throw PdfError for non-existent file", async () => {
			const badPath = new PdfInfo("non-existent.pdf");
			await expect(badPath.execute()).rejects.toThrow(PdfError);
		});
	});
});
