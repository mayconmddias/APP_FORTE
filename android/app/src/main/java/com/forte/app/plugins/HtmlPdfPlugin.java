package com.forte.app.plugins;

import android.content.Context;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintDocumentInfo;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;

@CapacitorPlugin(name = "HtmlPdf")
public class HtmlPdfPlugin extends Plugin {

    private static class MyLayoutResultCallback extends PrintDocumentAdapter.LayoutResultCallback {
        private final PrintDocumentAdapter adapter;
        private final PageRange[] pageRanges;
        private final ParcelFileDescriptor pfd;
        private final PluginCall call;
        private final File pdfFile;

        public MyLayoutResultCallback(PrintDocumentAdapter adapter, PageRange[] pageRanges, ParcelFileDescriptor pfd, File pdfFile, PluginCall call) {
            super();
            this.adapter = adapter;
            this.pageRanges = pageRanges;
            this.pfd = pfd;
            this.pdfFile = pdfFile;
            this.call = call;
        }

        @Override
        public void onLayoutFinished(PrintDocumentInfo info, boolean changed) {
            adapter.onWrite(pageRanges, pfd, null, new MyWriteResultCallback(pfd, pdfFile, call));
        }

        @Override
        public void onLayoutFailed(CharSequence error) {
            try {
                pfd.close();
            } catch (Exception e) {
                // ignore
            }
            call.reject("Erro de layout do PDF nativo: " + error);
        }
    }

    private static class MyWriteResultCallback extends PrintDocumentAdapter.WriteResultCallback {
        private final ParcelFileDescriptor pfd;
        private final File pdfFile;
        private final PluginCall call;

        public MyWriteResultCallback(ParcelFileDescriptor pfd, File pdfFile, PluginCall call) {
            super();
            this.pfd = pfd;
            this.pdfFile = pdfFile;
            this.call = call;
        }

        @Override
        public void onWriteFinished(PageRange[] pages) {
            try {
                pfd.close();
                JSObject ret = new JSObject();
                String fileUri = "file://" + pdfFile.getAbsolutePath();
                ret.put("uri", fileUri);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Erro ao fechar ParcelFileDescriptor: " + e.getMessage());
            }
        }

        @Override
        public void onWriteFailed(CharSequence error) {
            try {
                pfd.close();
            } catch (Exception e) {
                // ignore
            }
            call.reject("Erro de escrita do PDF nativo: " + error);
        }
    }

    @PluginMethod
    public void generatePdf(PluginCall call) {
        String html = call.getString("html");
        String fileName = call.getString("fileName");
        if (html == null || fileName == null) {
            call.reject("HTML e fileName são obrigatórios");
            return;
        }

        getBridge().getActivity().runOnUiThread(() -> {
            try {
                Context context = getBridge().getContext();
                WebView webView = new WebView(context);
                webView.getSettings().setJavaScriptEnabled(true);
                webView.getSettings().setDomStorageEnabled(true);
                
                webView.setWebViewClient(new WebViewClient() {
                    @Override
                    public void onPageFinished(WebView view, String url) {
                        try {
                            File cacheDir = context.getCacheDir();
                            File pdfFile = new File(cacheDir, fileName);
                            if (pdfFile.exists()) {
                                pdfFile.delete();
                            }

                            PrintAttributes attributes = new PrintAttributes.Builder()
                                .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                                .setResolution(new PrintAttributes.Resolution("pdf", "pdf", 300, 300))
                                .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                                .build();

                            PrintDocumentAdapter adapter = webView.createPrintDocumentAdapter("Document");
                            ParcelFileDescriptor pfd = ParcelFileDescriptor.open(pdfFile, ParcelFileDescriptor.MODE_READ_WRITE | ParcelFileDescriptor.MODE_CREATE | ParcelFileDescriptor.MODE_TRUNCATE);

                            adapter.onLayout(null, attributes, null, new MyLayoutResultCallback(
                                adapter, 
                                new PageRange[]{PageRange.ALL_PAGES}, 
                                pfd, 
                                pdfFile, 
                                call
                            ), null);

                        } catch (Exception e) {
                            call.reject("Falha na criação do PDF nativo: " + e.getMessage());
                        }
                    }
                });

                webView.loadDataWithBaseURL("https://localhost", html, "text/html", "UTF-8", null);

            } catch (Exception e) {
                call.reject("Erro ao inicializar WebView de impressão: " + e.getMessage());
            }
        });
    }
}
