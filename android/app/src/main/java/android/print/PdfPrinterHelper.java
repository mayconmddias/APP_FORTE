package android.print;

import android.os.Bundle;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintDocumentInfo;
import java.io.File;

public class PdfPrinterHelper {

    public interface PdfResultListener {
        void onSuccess(String fileUri);
        void onError(String message);
    }

    public static void print(PrintDocumentAdapter adapter, PrintAttributes attributes, ParcelFileDescriptor pfd, File pdfFile, PdfResultListener listener) {
        
        PrintDocumentAdapter.LayoutResultCallback layoutCallback = new PrintDocumentAdapter.LayoutResultCallback() {
            @Override
            public void onLayoutFinished(PrintDocumentInfo info, boolean changed) {
                
                PrintDocumentAdapter.WriteResultCallback writeCallback = new PrintDocumentAdapter.WriteResultCallback() {
                    @Override
                    public void onWriteFinished(PageRange[] pages) {
                        try {
                            pfd.close();
                            listener.onSuccess("file://" + pdfFile.getAbsolutePath());
                        } catch (Exception e) {
                            listener.onError("Erro ao fechar ParcelFileDescriptor: " + e.getMessage());
                        }
                    }

                    @Override
                    public void onWriteFailed(CharSequence error) {
                        try {
                            pfd.close();
                        } catch (Exception e) {
                            // ignore
                        }
                        listener.onError("Erro de escrita do PDF nativo: " + error);
                    }
                };

                adapter.onWrite(new PageRange[]{PageRange.ALL_PAGES}, pfd, null, writeCallback);
            }

            @Override
            public void onLayoutFailed(CharSequence error) {
                try {
                    pfd.close();
                } catch (Exception e) {
                    // ignore
                }
                listener.onError("Erro de layout do PDF nativo: " + error);
            }
        };

        adapter.onLayout(null, attributes, null, layoutCallback, null);
    }
}
