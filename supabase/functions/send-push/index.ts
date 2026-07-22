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

  const pemContents = FIREBASE_PRIVATE_KEY
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\\n/g, "")
    .replace(/\n/g, "")
    .replace(/\r/g, "")
    .replace(/\"/g, "")
    .replace(/\s/g, "");
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

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let reqBody: any = {};
    try {
      reqBody = await req.json();
    } catch {
      reqBody = {};
    }

    const isTest = reqBody.test === true;

    // 1. Buscar todos os tokens de push cadastrados na tabela push_tokens
    const { data: tokens, error: tokensError } = await supabase
      .from('push_tokens')
      .select('token, user_id');

    if (tokensError || !tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum token de push encontrado no banco." }), { status: 200 });
    }

    // Obter Token de Autenticação do Firebase
    const accessToken = await getAccessToken();

    const results: any[] = [];

    const sendPush = async (title: string, body: string, customTag?: string) => {
      const tag = customTag || `push-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      // Transmitir via FCM API (Android Push & FCM Web Push)
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
                title,
                body,
              },
              data: {
                title,
                body,
                tag
              },
              android: {
                priority: 'high',
                notification: {
                  sound: 'default',
                  click_action: 'FCM_PLUGIN_ACTIVITY',
                  icon: 'fcm_push_icon',
                  tag
                }
              },
              webpush: {
                headers: {
                  Urgency: 'high'
                },
                notification: {
                  title,
                  body,
                  icon: 'https://tnwbnjksbhskgyqdibsu.supabase.co/storage/v1/object/public/assets/logo_desenho_forte.png',
                  badge: 'https://tnwbnjksbhskgyqdibsu.supabase.co/storage/v1/object/public/assets/logo_desenho_forte.png',
                  tag,
                  renotify: true
                },
                fcm_options: {
                  link: '/'
                }
              }
            },
          }),
        });
        results.push(await res.json());
      }
    };

    // MODO TESTE DIRETO
    if (isTest) {
      const testTitle = reqBody.title || '🔔 Teste de Notificação Push';
      const testBody = reqBody.body || 'Notificação de teste enviada com sucesso para o sistema Desktop e Mobile!';
      await sendPush(testTitle, testBody);
      return new Response(JSON.stringify({ success: true, test: true, results }), { status: 200 });
    }

    // 3. Datas limite (hoje e hoje + 30 dias)
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() + 30);
    const limitDateStr = limitDate.toISOString().split('T')[0];

    // 4. Buscar documentos e integrações
    const { data: allDocs, error: docErr } = await supabase
      .from('documentos')
      .select('tipo_documento, data_vencimento, funcionario_id');

    if (docErr) console.error('Erro ao consultar documentos:', docErr);

    const { data: allInts, error: intErr } = await supabase
      .from('funcionario_integracoes')
      .select('empresa_nome, data_vencimento, funcionario_id');

    if (intErr) console.error('Erro ao consultar integrações:', intErr);

    const documentos = (allDocs || []).filter(d => {
      if (!d.data_vencimento) return false;
      const vDate = String(d.data_vencimento).split('T')[0];
      return vDate <= limitDateStr;
    });

    const integracoes = (allInts || []).filter(i => {
      if (!i.data_vencimento) return false;
      const vDate = String(i.data_vencimento).split('T')[0];
      return vDate <= limitDateStr;
    });

    const hasDocs = documentos.length > 0;
    const hasInts = integracoes.length > 0;

    if (!hasDocs && !hasInts) {
      await sendPush('🔔 Teste de Notificação Push', 'Sistema verificado: Nenhum documento ou integração vencida/pendente no banco.');
      return new Response(JSON.stringify({ success: true, message: "Disparo de teste realizado (sem pendências no banco).", results }), { status: 200 });
    }

    // Coletar IDs únicos de funcionários
    const docsFuncIds = documentos?.map(d => d.funcionario_id) || [];
    const intsFuncIds = integracoes?.map(i => i.funcionario_id) || [];
    const funcionarioIds = [...new Set([...docsFuncIds, ...intsFuncIds])].filter(Boolean);

    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, name')
      .in('id', funcionarioIds);

    const funcionarioMap = new Map(profiles?.map(p => [p.id, p.name]) || []);

    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    // 6. Alertas de documentos
    if (documentos) {
      let docIdx = 0;
      for (const doc of documentos) {
        docIdx++;
        const nomeFuncionario = funcionarioMap.get(doc.funcionario_id) || 'Funcionário';
        const formattedDate = formatDate(doc.data_vencimento);
        const bodyText = `${doc.tipo_documento} - ${nomeFuncionario} - ${formattedDate}`;
        const tag = `doc-${doc.funcionario_id}-${docIdx}-${Date.now()}`;
        await sendPush('🚨 Documento!', bodyText, tag);
        await sleep(600);
      }
    }

    // 7. Alertas de integrações
    if (integracoes) {
      let intIdx = 0;
      for (const int of integracoes) {
        intIdx++;
        const nomeFuncionario = funcionarioMap.get(int.funcionario_id) || 'Funcionário';
        const formattedDate = formatDate(int.data_vencimento);
        const bodyText = `${int.empresa_nome || 'Cliente'} - ${nomeFuncionario} - ${formattedDate}`;
        const tag = `int-${int.funcionario_id}-${intIdx}-${Date.now()}`;
        await sendPush('🚨 Integração!', bodyText, tag);
        await sleep(600);
      }
    }

    return new Response(JSON.stringify({ success: true, results }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
