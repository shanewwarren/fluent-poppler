# Fluent poppler-api for Node.js

A Node.js wrapper for:
- [pdfinfo](https://manpages.debian.org/testing/poppler-utils/pdfinfo.1.en.html) - To extract metadata and information from a pdf.



- [pdftoppm](https://manpages.debian.org/testing/poppler-utils/pdftoppm.1.en.html) - Convert pdfs to images.

## Installation

```bash
$ npm install fluent-poppler
```

## Prerequisites

This package requires `poppler-utils` to be installed on your system:

### Ubuntu/Debian

```bash
$ sudo apt-get install poppler-utils
```

### macOS

```bash
$ brew install poppler
```

### Windows

Download and install poppler from: [Poppler Packaged for Windows](https://github.com/oschwartz10612/poppler-windows)

### AWS Lambda Layer

[AWS Lambda Poppler Layer](https://github.com/jeylabs/aws-lambda-poppler-layer)


## Usage

### PdfInfo Class

The PdfInfo class extracts metadata and information from PDF files.

```typescript
import { PdfInfo } from 'fluent-poppler';

// Initialize with file path or buffer
const pdfInfo = new PdfInfo('path/to/file.pdf');
// OR
const buffer = Buffer.from('...');
const pdfInfoFromBuffer = new PdfInfo(buffer);
```

#### Available Options

```typescript
const info = await pdfInfo
  .firstPage(1)           // Start from specific page
  .lastPage(5)           // End at specific page
  .boxInfo()             // Include page box information (MediaBox, CropBox, etc)
  .metadata()            // Include document metadata
  .customMetadata()      // Include custom metadata
  .javaScript()          // Include JavaScript content
  .structure()           // Include document structure (Tagged-PDF)
  .structureText()       // Include structural text content
  .urls()                // Include all URLs in annotations
  .isoDates()            // Use ISO-8601 date format
  .rawDates()            // Use raw date format
  .execute();

// Example response
console.log(info);
/* {
  fileName: "example.pdf",
  title: "Document Title",
  author: "Author Name",
  creator: "PDF Creator",
  producer: "PDF Producer",
  creationDate: "2024-01-01T12:00:00Z",
  modDate: "2024-01-02T12:00:00Z",
  tagged: true,
  pageCount: 5,
  encrypted: false,
  pageSize: {
    width: 612,
    height: 792
  },
  fileSize: 1024576,
  optimized: true,
  linearized: false
} */
```

### StreamPdfToPpm Class

StreamPdfToPpm converts PDF pages to image buffers in memory.

#### Basic Usage

```typescript
import { StreamPdfToPpm } from 'fluent-poppler';

const converter = new StreamPdfToPpm()
  .input('path/to/file.pdf');
```

#### Output Format Options

```typescript
// JPEG output with options
converter.jpeg({
  quality: 100,        // 0-100
  progressive: true,   // Enable progressive encoding
  optimize: true       // Enable optimization
});

// PNG output
converter.png();

// TIFF output with compression
converter.tiff('none' | 'packbits' | 'jpeg' | 'lzw' | 'deflate');

// Monochrome output
converter.monochrome();

// Grayscale output
converter.grayscale();
```

#### Resolution and Scaling

```typescript
converter
  .resolution(300)                    // Set DPI
  .resolutionXY(300, 150)            // Set different X/Y DPI
  .scaleTo(1000)                     // Scale to fit within 1000 pixels
  .scaleToXY(800, 600)               // Scale to exact dimensions
  .crop(100, 100, 500, 500)          // Crop output (x, y, width, height)
  .cropSquare(500);                  // Crop to square
```

#### Anti-aliasing and Quality Options

```typescript
converter
  .antiAliasing(true, true)          // Font and vector anti-aliasing
  .thinLineMode('none' | 'solid' | 'shape')
  .freeType(true)                    // Enable FreeType font renderer
  .forcePageNumber()                 // Force page numbers in output
  .overprint();                      // Enable overprint preview
```

#### Password Protection

```typescript
converter
  .ownerPassword('ownerpass')        // Set owner password
  .userPassword('userpass');         // Set user password
```

#### Converting Pages

```typescript
// Convert single page
const buffer = await converter.convert(1);
await writeFile('page-1.jpg', buffer);

// Convert multiple pages in parallel
const pageCount = 5;
const buffers = await Promise.all(
  Array.from({ length: pageCount }, (_, i) =>
    converter.convert(i + 1)
  )
);
```

### PdfToPpm Class

PdfToPpm converts PDF pages to image files on disk.

#### Basic Usage

```typescript
import { PdfToPpm } from 'fluent-poppler';

const converter = new PdfToPpm()
  .input('path/to/file.pdf')
  .outputPrefix('output/page');
```

#### Page Selection and Format

```typescript
const fileNames = await converter
  .firstPage(1)                      // Start from page 1
  .lastPage(5)                       // End at page 5
  .jpeg({                           // Output as JPEG
    quality: 90,
    progressive: true,
    optimize: true
  })
  .resolution(300)                   // Set resolution
  .convert();

console.log(fileNames);
// ['output/page-1.jpg', 'output/page-2.jpg', ..., 'output/page-5.jpg']
```

#### Advanced Options

```typescript
converter
  // Quality settings
  .antiAliasing(true, true)
  .thinLineMode('solid')
  .freeType(true)

  // Layout
  .scaleTo(1000)
  .crop(0, 0, 500, 500)

  // Security
  .ownerPassword('pass')
  .userPassword('pass')

  // Output control
  .forcePageNumber()
  .overprint();
```

### Error Handling

```typescript
try {
  await converter.convert();
} catch (error) {
  if (error.message.includes('not found')) {
    console.error('Poppler utilities not installed');
  } else if (error.message.includes('permission denied')) {
    console.error('PDF is password protected');
  } else {
    console.error('Conversion failed:', error);
  }
}
```

### Environment Configuration

```typescript
// Set custom Poppler path
import { setPopplerPath } from 'fluent-poppler';
setPopplerPath('/usr/local/bin');

// Or use environment variable
process.env.POPPLER_PATH = '/usr/local/bin';

// Otherwise location of the executable will be located via `which`
```