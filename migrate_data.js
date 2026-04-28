
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tnwbnjksbhskgyqdibsu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_uGkKal41PXStrmQHl7bRCQ_iDQcTlYW';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function migrate() {
    console.log('--- Iniciando Migração (ESM) ---');

    const { data: currentUsers, error: uErr } = await supabase.from('user_profiles').select('email, id, name');
    if (uErr) { console.error('Erro users:', uErr); return; }
    
    const { data: employees, error: eErr } = await supabase.from('funcionarios').select('*');
    if (eErr) { console.error('Erro emps:', eErr); return; }

    const { data: docs } = await supabase.from('documentos').select('*');
    const { data: ints } = await supabase.from('funcionario_integracoes').select('*');

    const emailSet = new Set(currentUsers.map(u => u.email.toLowerCase()));
    const idMap = {};
    const uniqueEmployees = {};

    employees.forEach(emp => {
        const normalized = emp.nome.trim().toUpperCase();
        if (!uniqueEmployees[normalized]) {
            uniqueEmployees[normalized] = {
                canonicalName: emp.nome.trim().toUpperCase(),
                funcao: emp.funcao?.trim().toUpperCase() || '',
                oldIds: []
            };
        } else {
            if (emp.nome.length > uniqueEmployees[normalized].canonicalName.length) {
                uniqueEmployees[normalized].canonicalName = emp.nome.trim().toUpperCase();
            }
            if (!uniqueEmployees[normalized].funcao && emp.funcao) {
                uniqueEmployees[normalized].funcao = emp.funcao.trim().toUpperCase();
            }
        }
        uniqueEmployees[normalized].oldIds.push(emp.id);
    });

    console.log(`Encontrados ${employees.length} registros. Convertendo para ${Object.keys(uniqueEmployees).length} usuários únicos.`);

    let userCount = currentUsers.length;
    const usersToInsert = [];

    for (const normName in uniqueEmployees) {
        const empData = uniqueEmployees[normName];
        const existingUser = currentUsers.find(u => u.name?.toUpperCase() === normName);
        let newId;

        if (existingUser) {
            newId = existingUser.id;
            console.log(`Usuário já existe: ${normName} (${newId})`);
        } else {
            userCount++;
            newId = `FE-${String(userCount).padStart(3, '0')}`;
            
            const firstName = empData.canonicalName.split(' ')[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            let email = `${firstName}@forteengenharia.net.br`;
            let suffix = 1;
            while (emailSet.has(email)) {
                email = `${firstName}${suffix}@forteengenharia.net.br`;
                suffix++;
            }
            emailSet.add(email);

            usersToInsert.push({
                id: newId,
                name: empData.canonicalName,
                email: email,
                password: '123456',
                role: 'TECNICO',
                funcao: empData.funcao,
                version: 1
            });
            console.log(`Novo usuário criado: ${empData.canonicalName} -> ${email} (${newId})`);
        }

        empData.oldIds.forEach(oldId => {
            idMap[oldId] = newId;
        });
    }

    if (usersToInsert.length > 0) {
        const { error: userErr } = await supabase.from('user_profiles').insert(usersToInsert);
        if (userErr) {
            console.error('Erro ao inserir usuários:', userErr);
            return;
        }
        console.log(`${usersToInsert.length} novos usuários inseridos.`);
    }

    console.log('Migrando documentos...');
    for (const doc of (docs || [])) {
        const targetId = idMap[doc.funcionario_id];
        if (targetId && targetId !== doc.funcionario_id) {
            await supabase.from('documentos').update({ funcionario_id: targetId }).eq('id', doc.id);
        }
    }

    console.log('Migrando integrações...');
    for (const int of (ints || [])) {
        const targetId = idMap[int.funcionario_id];
        if (targetId && targetId !== int.funcionario_id) {
            await supabase.from('funcionario_integracoes').update({ funcionario_id: targetId }).eq('id', int.id);
        }
    }

    console.log('--- Migração Concluída com Sucesso ---');
}

migrate();
