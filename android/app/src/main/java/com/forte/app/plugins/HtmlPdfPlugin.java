package com.forte.app.plugins;

import android.content.Context;
import android.os.Bundle;
import android.os.ParcelFileDescriptor;
import android.print.PdfPrinterHelper;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
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

                            // Chama o helper definido no pacote android.print para ignorar a restrição de visibilidade
                            PdfPrinterHelper.print(adapter, attributes, pfd, pdfFile, new PdfPrinterHelper.PdfResultListener() {
                                @Override
                                public void onSuccess(String fileUri) {
                                    JSObject ret = new JSObject();
                                    ret.put("uri", fileUri);
                                    call.resolve(ret);
                                }

                                @Override
                                public void onError(String message) {
                                    call.reject(message);
                                }
                            });

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
