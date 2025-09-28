// =================================================================================================
// AGENTE DE AUTOMAÇÃO MULTIUSUÁRIO
// =================================================================================================
//
// DESCRIÇÃO:
// Este script escuta a coleção 'reports' no Firestore. Quando um novo relatório com status
// 'pending' é adicionado, o robô:
// 1. Identifica o supervisor dono do relatório.
// 2. Busca as credenciais específicas daquele supervisor no Firestore.
// 3. Decodifica a senha.
// 4. Realiza o login e preenche o formulário no portal do governo.
//
// =================================================================================================

// --- Importação de Módulos ---
const { chromium } = require('playwright');
const admin = require('firebase-admin');
const { GOV_URLS, SELECTORS } = require('./config.js');

// --- Configuração do Firebase Admin ---
try {
    const serviceAccount = require('./firebase-service-account.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('\x1b[32m%s\x1b[0m', '✔ Autenticado com o Firebase com sucesso!');
} catch (error) {
    console.error('\x1b[31m%s\x1b[0m', 'ERRO: O arquivo "firebase-service-account.json" não foi encontrado ou é inválido.');
    process.exit(1);
}

const db = admin.firestore();

/**
 * ===============================================================================================
 * FUNÇÃO DE PREENCHIMENTO INTELIGENTE (Inalterada)
 * ===============================================================================================
 */
async function fillFieldSmartly(page, key, selector, value) {
    try {
        const elementType = await page.evaluate(sel => {
            const element = document.querySelector(sel);
            if (!element) return null;
            const tagName = element.tagName.toLowerCase();
            if (tagName === 'select') return 'select';
            if (tagName === 'textarea') return 'textarea';
            if (tagName === 'input') return element.type.toLowerCase() || 'text';
            return tagName;
        }, selector);

        if (!elementType) {
            console.warn(`\x1b[33m%s\x1b[0m`, `  - AVISO: Campo "${key}" não encontrado com o seletor "${selector}".`);
            return;
        }

        switch (elementType) {
            case 'select': await page.selectOption(selector, { value: value }); break;
            case 'radio': await page.check(`${selector}[value="${value}"]`); break;
            case 'checkbox':
                if (value && value.toLowerCase() !== 'nao' && value.toLowerCase() !== 'off') {
                    await page.check(selector);
                } else {
                    await page.uncheck(selector);
                }
                break;
            default: await page.fill(selector, value); break;
        }
        console.log(`  - [${elementType.toUpperCase()}] Campo "${key}" preenchido.`);
    } catch (e) {
        console.error('\x1b[31m%s\x1b[0m', `  - ERRO ao preencher o campo "${key}" (seletor: ${selector}).\n    Detalhes: ${e.message}`);
        throw e;
    }
}

/**
 * ===============================================================================================
 * FUNÇÃO PRINCIPAL QUE PROCESSA UM ÚNICO RELATÓRIO (LÓGICA MULTIUSUÁRIO)
 * ===============================================================================================
 */
async function processReport(reportDoc) {
    const reportId = reportDoc.id;
    const formData = reportDoc.data();
    const reportRef = db.collection('reports').doc(reportId);

    console.log('\x1b[36m%s\x1b[0m', `\n▶ Processando relatório: ${reportId} para o supervisor: ${formData.supervisorId}`);

    // 1. Validar se o relatório tem um dono (supervisorId)
    if (!formData.supervisorId) {
        console.error('\x1b[31m%s\x1b[0m', `  - ERRO FATAL: O relatório ${reportId} não tem um 'supervisorId'.`);
        return reportRef.update({ reportStatus: 'failed', errorMessage: 'Relatório não contém ID do supervisor.' });
    }

    // 2. Buscar as credenciais do supervisor no Firestore
    let govCredentials;
    try {
        const credsDocRef = db.collection('supervisor_credentials').doc(formData.supervisorId);
        const credsDoc = await credsDocRef.get();
        if (!credsDoc.exists) {
            throw new Error('As credenciais do supervisor não foram encontradas no banco de dados. Peça para ele salvar em "Minhas Credenciais".');
        }
        const credsData = credsDoc.data();
        govCredentials = {
            user: credsData.login,
            password: Buffer.from(credsData.encodedPassword, 'base64').toString('utf8')
        };
        console.log(`  ✔ Credenciais encontradas para o supervisor ${formData.supervisorId}.`);
    } catch (error) {
        console.error('\x1b[31m%s\x1b[0m', `  - ERRO: Falha ao buscar ou decodificar credenciais.`, error);
        return reportRef.update({ reportStatus: 'failed', errorMessage: error.message });
    }

    // 3. Iniciar o navegador
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        // 4. Processo de Login (usando as credenciais dinâmicas)
        console.log(`  Navegando para o portal inicial...`);
        await page.goto(GOV_URLS.login); // Vai para a página de boas-vindas
        await page.click('a[href="/webportfolio/secured/"]'); // Clica em "Entrar"
        await page.waitForURL('**/acesso.unasus.gov.br/**'); // Espera a página de login real carregar

        console.log(`  Realizando login para o usuário: ${govCredentials.user}`);
        await page.fill(SELECTORS.userField, govCredentials.user);
        await page.fill(SELECTORS.passwordField, govCredentials.password);
        await page.click(SELECTORS.loginButton);

        await page.waitForURL(GOV_URLS.form, { timeout: 20000 }); // Espera o redirecionamento para o dashboard
        console.log('\x1b[32m%s\x1b[0m', '  ✔ Login realizado com sucesso!');

        // 5. Navegar até o formulário (se necessário, pode já estar na página certa)
        // Esta parte pode precisar de lógica adicional, como clicar no nome de um médico.
        // Por agora, vamos assumir que o GOV_URLS.form é acessível diretamente após o login.
        console.log(`  Navegando para a página do formulário...`);
        await page.goto(GOV_URLS.form);

        // 6. Preencher o formulário
        console.log('  Iniciando o preenchimento dos campos...');
        for (const [key, value] of Object.entries(formData)) {
            const selector = SELECTORS.fields[key];
            if (selector && value) {
                await fillFieldSmartly(page, key, selector, value);
            }
        }
        console.log('\x1b[32m%s\x1b[0m', '  ✔ Preenchimento do formulário concluído.');

        // 7. Enviar o formulário
        await page.click(SELECTORS.saveFormButton);
        console.log('\x1b[32m%s\x1b[0m', '  ✔ Formulário enviado com sucesso!');

        // 8. Atualizar o status no Firestore
        await reportRef.update({ reportStatus: 'completed', processedAt: admin.firestore.FieldValue.serverTimestamp() });
        console.log('\x1b[32m%s\x1b[0m', `✔ Relatório ${reportId} marcado como 'completed'.`);

    } catch (error) {
        console.error('\x1b[31m%s\x1b[0m', `\nERRO AO PROCESSAR O RELATÓRIO ${reportId}:`, error);
        await reportRef.update({ reportStatus: 'failed', errorMessage: error.message, processedAt: admin.firestore.FieldValue.serverTimestamp() });
    } finally {
        await browser.close();
        console.log(`\n🏁 Finalizado o processamento para o relatório: ${reportId}.`);
    }
}

/**
 * ===============================================================================================
 * FUNÇÃO QUE ESCUTA POR NOVOS RELATÓRIOS PENDENTES (Inalterada)
 * ===============================================================================================
 */
function listenForPendingReports() {
    console.log('\x1b[34m%s\x1b[0m', '🤖 Robô iniciado. Aguardando por novos relatórios...');
    const query = db.collection('reports').where('reportStatus', '==', 'pending');

    query.onSnapshot(snapshot => {
        if (snapshot.empty) {
            console.log('  Nenhum relatório pendente encontrado. Aguardando...');
            return;
        }

        snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
                processReport(change.doc);
            }
        });
    }, err => {
        console.error('\x1b[31m%s\x1b[0m', 'ERRO no listener do Firestore: ', err);
    });
}

// --- Execução ---
// A validação antiga foi removida. O robô simplesmente inicia.
listenForPendingReports();