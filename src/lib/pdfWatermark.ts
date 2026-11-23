import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';

/**
 * Downloads a PDF file directly to the user's device Downloads folder
 * with programmatic Blob triggering, and optionally stamps a subtle watermark.
 */
export async function downloadDirectWatermarkedPdf(
  fileUrl: string,
  fileName: string,
  studentInfo?: { name?: string; code?: string }
): Promise<void> {
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error('فشل جلب ملف الـ PDF من الخادم');
  }

  const arrayBuffer = await response.arrayBuffer();
  let finalPdfData: Uint8Array = new Uint8Array(arrayBuffer);

  try {
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();

    // Prepare safe watermark text (Latin alphanumeric safe for pdf-lib standard fonts)
    const code = studentInfo?.code || 'DST-LAW';
    const stampText = `EL-DOSTOUR • ${code} • SADAT FACULTY OF LAW`;

    pages.forEach((page) => {
      const { width, height } = page.getSize();
      page.drawText(stampText, {
        x: width * 0.15,
        y: height * 0.5,
        size: Math.min(width, height) * 0.035,
        font,
        color: rgb(0.7, 0.55, 0.2), // Subtle luxury gold
        opacity: 0.18,
        rotate: degrees(45),
      });
    });

    finalPdfData = await pdfDoc.save();
  } catch (err) {
    console.warn('PDF watermarking notice (fallback to direct binary download):', err);
    finalPdfData = new Uint8Array(arrayBuffer);
  }

  // Trigger immediate programmatic browser download straight to Downloads folder
  const blob = new Blob([finalPdfData as any], { type: 'application/pdf' });
  const blobUrl = window.URL.createObjectURL(blob);
  const downloadLink = document.createElement('a');
  downloadLink.href = blobUrl;
  downloadLink.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);

  setTimeout(() => {
    window.URL.revokeObjectURL(blobUrl);
  }, 3000);
}
