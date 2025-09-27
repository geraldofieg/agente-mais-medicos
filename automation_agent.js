// =================================================================================================
// AGENTE DE AUTOMAÇÃO COM FIREBASE PARA PREENCHIMENTO DO FORMULÁRIO "MAIS MÉDICOS"
// =================================================================================================
//
// DESCRIÇÃO:
// Este script usa a biblioteca Playwright e Firebase Admin SDK para automatizar o preenchimento.
// Ele escuta em tempo real a coleção 'reports' no Firestore. Quando um novo relatório com status
// 'pending' é adicionado, o robô o processa, preenche o formulário web e atualiza o status.
//
// COMO USAR:
// 1. Gere o arquivo de chave de serviço do Firebase e salve-o como 'firebase-service-account.json'.
// 2. Configure os arquivos `.env` (credenciais) e `config.js` (URLs e seletores).
// 3. Execute no terminal: node automation_agent.js
//
// =================================================================================================

// --- Importação de Módulos ---
require('dotenv').config();
const { chromium } = require('playwright');
const admin = require('firebase-admin');

// Importa as configurações (URLs e Seletores) do arquivo externo
const { GOV_URLS, SELECTORS } = require('./config.js');

// --- Configuração do Firebase Admin ---
// O robô precisa de uma chave de serviço para se autenticar com privilégios de administrador.
// Este arquivo é confidencial e NÃO deve ser enviado para o GitHub.
try {
    const serviceAccount = require('./firebase-service-account.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('\x1b[32m%s\x1b[0m', '✔ Autenticado com o Firebase com sucesso!');
} catch (error) {
    console.error('\x1b[31m%s\x1b[0m', 'ERRO: O arquivo "firebase-service-account.json" não foi encontrado ou é inválido.');
    console.error('Por favor, siga as instruções no README para gerá-lo e colocá-lo na pasta raiz do projeto.');
    process.exit(1); // Encerra o script se não conseguir conectar ao Firebase
}

const db = admin.firestore();

// --- Pega as credenciais do arquivo .env ---
const LOGIN_CREDENCIALS = {
    user: process.env.LOGIN_USER,
    password: process.env.LOGIN_PASSWORD,
};


/**
 * ===============================================================================================
 * FUNÇÃO DE PREENCHIMENTO INTELIGENTE (sem alterações)
 * ===============================================================================================
 */
async function fillFieldSmartly(page, key, selector, value) {
    // ... (código da função mantido, pois é reutilizável e robusto)
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
            console.warn(`\x1b[33m%s\x1b[0m`, `  - AVISO: Campo "${key}" não encontrado no site com o seletor "${selector}".`);
            return;
        }

        switch (elementType) {
            case 'select':
                await page.selectOption(selector, { value: value });
                break;
            case 'radio':
                await page.check(`${selector}[value="${value}"]`);
                break;
            case 'checkbox':
                if (value && value.toLowerCase() !== 'nao' && value.toLowerCase() !== 'off') {
                    await page.check(selector);
                } else {
                    await page.uncheck(selector);
                }
                break;
            default:
                await page.fill(selector, value);
                break;
        }
        console.log(`  - [${elementType.toUpperCase()}] Campo "${key}" preenchido.`);
    } catch (e) {
        console.error('\x1b[31m%s\x1b[0m', `  - ERRO ao preencher o campo "${key}" (seletor: ${selector}).\n    Detalhes: ${e.message}`);
        throw e; // Lança o erro para que a função principal possa tratá-lo
    }
}


/**
 * ===============================================================================================
 * FUNÇÃO PRINCIPAL QUE PROCESSA UM ÚNICO RELATÓRIO
 * ===============================================================================================
 */
async function processReport(reportDoc) {
    const reportId = reportDoc.id;
    const formData = reportDoc.data();
    console.log('\x1b[36m%s\x1b[0m', `\n▶ Processando novo relatório: ${reportId}`);

    // 1. Iniciar o navegador
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    const reportRef = db.collection('reports').doc(reportId);

    try {
        // 2. Processo de Login
        console.log(`  Navegando para a página de login...`);
        await page.goto(GOV_URLS.login);
        await page.fill(SELECTORS.userField, LOGIN_CREDENCIALS.user);
        await page.fill(SELECTORS.passwordField, LOGIN_CREDENCIALS.password);
        await page.click(SELECTORS.loginButton);
        await page.waitForNavigation();
        console.log('\x1b[32m%s\x1b[0m', '  ✔ Login realizado com sucesso!');

        // 3. Navegar até o formulário
        if (GOV_URLS.form && GOV_URLS.form !== GOV_URLS.login) {
            console.log(`  Navegando para a página do formulário...`);
            await page.goto(GOV_URLS.form);
        }

        // 4. Preencher o formulário
        console.log('  Iniciando o preenchimento dos campos do formulário...');
        for (const [key, value] of Object.entries(formData)) {
            const selector = SELECTORS.fields[key];
            if (selector && value) {
                await fillFieldSmartly(page, key, selector, value);
            }
        }
        console.log('\x1b[32m%s\x1b[0m', '  ✔ Preenchimento do formulário concluído.');

        // 5. Enviar o formulário
        await page.click(SELECTORS.saveFormButton);
        console.log('\x1b[32m%s\x1b[0m', '  ✔ Formulário enviado com sucesso!');

        // 6. Atualizar o status no Firestore para 'completed'
        await reportRef.update({
            reportStatus: 'completed',
            processedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('\x1b[32m%s\x1b[0m', `✔ Relatório ${reportId} marcado como 'completed'.`);

    } catch (error) {
        console.error('\x1b[31m%s\x1b[0m', `\nERRO AO PROCESSAR O RELATÓRIO ${reportId}:`);
        console.error(error);
        // Atualiza o status no Firestore para 'failed'
        await reportRef.update({
            reportStatus: 'failed',
            errorMessage: error.message,
            processedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    } finally {
        // Fecha o navegador
        await browser.close();
        console.log(`\n🏁 Finalizado o processamento para o relatório: ${reportId}.`);
    }
}


/**
 * ===============================================================================================
 * FUNÇÃO QUE ESCUTA POR NOVOS RELATÓRIOS PENDENTES
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
                // Processa apenas os documentos que foram recém-adicionados
                processReport(change.doc);
            }
        });
    }, err => {
        console.error('\x1b[31m%s\x1b[0m', 'ERRO no listener do Firestore: ', err);
    });
}

// --- Validação Inicial e Execução ---
if (!LOGIN_CREDENCIALS.user || LOGIN_CREDENCIALS.user === 'SEU_USUARIO_AQUI' || !GOV_URLS.login || GOV_URLS.login === 'URL_DA_PAGINA_DE_LOGIN_AQUI') {
    console.error('\x1b[31m%s\x1b[0m', 'ERRO: As informações de configuração precisam ser preenchidas nos arquivos ".env" e "config.js".');
    console.error('Por favor, siga as instruções no arquivo README.md.');
} else {
    // Inicia o listener
    listenForPendingReports();
}