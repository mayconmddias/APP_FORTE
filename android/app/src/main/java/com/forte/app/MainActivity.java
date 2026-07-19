package com.forte.app;

import android.os.Bundle;
import com.forte.app.plugins.HtmlPdfPlugin;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(HtmlPdfPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

