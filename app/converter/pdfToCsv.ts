'use client';

import { useEffect, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

export async function convertPdfToCsv(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let csvContent = '';
    const headers = ['Page', 'Content'];
    csvContent += headers.join(',') + '\\n';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const text = textContent.items.map((item: any) => item.str).join(' ');
      const escapedText = text.replace(/,/g, ';');
      csvContent += `${i},${escapedText}\\n`;
    }

    return csvContent;
  } catch (error) {
    console.error('Error converting PDF to CSV:', error);
    throw new Error('Failed to convert PDF to CSV');
  }
}

// Initialize PDF.js worker
export function usePdfWorker() {
  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;
  }, []);
} 