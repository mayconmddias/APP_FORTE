import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const FIREBASE_PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID') || '';
const FIREBASE_CLIENT_EMAIL = Deno.env.get('FIREBASE_CLIENT_EMAIL') || '';
const FIREBASE_PRIVATE_KEY = Deno.env.get('FIREBASE_PRIVATE_KEY') || '';

// Função simples para assinar JWT e obter token do Google OAuth2
async function getAccessToken(): Promise<string> {
  const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: FIREBASE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: tokenUrl,
    exp: now + 3600,
    iat: now,
  };

  const textEncoder = new TextEncoder();
  const headerBase64 = btoa(JSON.stringify(header));
  const claimBase64 = btoa(JSON.stringify(claim));
  const stringToSign = `${headerBase64}.${claimBase64}`;

  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = privateKey.substring(pemHeader.length, privateKey.length - pemFooter.length).replace(/\s/g, '');
  const binaryDerString = atob(pemContents);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    textEncoder.encode(stringToSign)
  );

  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const jwt = `${headerBase64}.${claimBase64}.${signatureBase64}`;

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Buscar documentos vencidos
    const today = new Date().toISOString().split('T')[0];
    const { data: documentos, error: docError } = await supabase
      .from('documentos')
      .select('tipo_documento, data_vencimento, funcionarios(nome)')
      .lte('data_vencimento', today);

    if (docError || !documentos || documentos.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum documento vencido hoje." }), { status: 200 });
    }

    // 2. Buscar administradores
    const { data: admins } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('role', 'ADMIN');

    if (!admins || admins.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum administrador encontrado." }), { status: 200 });
    }

    // 3. Buscar tokens de push desses administradores
    const adminIds = admins.map(a => a.id);
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .in('user_id', adminIds);

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum token encontrado para administradores." }), { status: 200 });
    }

    // Obter Token de Autenticação do Firebase
    const accessToken = await getAccessToken();

    // 4. Enviar notificações
    const results = [];
    for (const doc of documentos) {
      const nomeFuncionario = (doc.funcionarios as any)?.nome || 'Funcionário';
      const bodyText = `O documento "${doc.tipo_documento}" de ${nomeFuncionario} venceu em ${doc.data_vencimento}.`;

      for (const t of tokens) {
        const res = await fetch(`https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              token: t.token,
              notification: {
                title: 'Documento Vencido!',
                body: bodyText,
              },
            },
          }),
        });
        results.push(await res.json());
      }
    }

    return new Response(JSON.stringify({ success: true, results }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
