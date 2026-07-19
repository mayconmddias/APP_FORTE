import { registerPlugin } from '@capacitor/core';

export interface HtmlPdfPlugin {
  generatePdf(options: { html: string; fileName: string }): Promise<{ uri: string }>;
}

const HtmlPdf = registerPlugin<HtmlPdfPlugin>('HtmlPdf');

export default HtmlPdf;
