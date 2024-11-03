import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PdfInfo } from "../src/pdf-info";
import { StreamPdfToPpm } from "../src/pdf-to-ppm/stream-pdf-to-ppm";

describe("StreamPdfToPpm", () => {
	describe("e2e", async () => {
		// test pdf path
		const testPdfPath = path.join(__dirname, "../assets", "Form-433-A.pdf");

		// create output directory
		const outputDir = path.join(__dirname, "output");
		await mkdir(outputDir, { recursive: true });

		it("should convert pdf to png", async () => {
			const pdfInfo = new PdfInfo(testPdfPath);
			const info = await pdfInfo.execute();

			const streamPdfToPpm = new StreamPdfToPpm()
				.input(testPdfPath)
				.jpeg({
					quality: 100,
					progressive: true,
					optimize: true,
				})
				.resolution(300);

			expect(info.pageCount).toEqual(18);

			// range from 1 to 18
			const range = Array.from({ length: info.pageCount });
			const pagePromises: Promise<void>[] = range.map(async (_, i) => {
				const buffer = await streamPdfToPpm.convert(i + 1);

				await writeFile(path.join(outputDir, `image-${i + 1}.jpg`), buffer);
			});

			await Promise.all(pagePromises);
		}, 15000);
	});
});
