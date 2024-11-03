import { mkdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PdfToPpm } from "../src/pdf-to-ppm/pdf-to-ppm";

describe("PdfToPpm", () => {
	describe("e2e", async () => {
		const pdfToPpm = new PdfToPpm();

		// test pdf path
		const testPdfPath = path.join(__dirname, "../assets", "Form-433-A.pdf");

		// create output directory
		const outputDir = path.join(__dirname, "output");
		await mkdir(outputDir, { recursive: true });

		// output prefix
		const outputPrefix = path.join(outputDir, "image");

		it("should convert pdf to png", async () => {
			const fileNames = await pdfToPpm
				.input(testPdfPath)
				.outputPrefix(outputPrefix)
				.firstPage(1)
				.lastPage(3)
				.png()
				.convert();

			expect(fileNames.length).toEqual(3);
		});
	});
});
