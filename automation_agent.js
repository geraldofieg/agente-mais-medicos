// =================================================================================================
// AGENTE DE AUTOMAÇÃO PARA PREENCHIMENTO DO FORMULÁRIO "MAIS MÉDICOS"
// =================================================================================================
//
// DESCRIÇÃO:
// Este script usa a biblioteca Playwright para automatizar o preenchimento de um formulário web.
// Ele lê os dados de um arquivo `dados.json` local, faz login em um site e preenche os campos.
//
// COMO USAR:
// 1. Configure os arquivos `.env` (credenciais) e `config.js` (URLs e seletores).
// 2. Gere o arquivo `dados.json` usando a página `index.html`.
// 3. Execute no terminal: npm start
//
// =================================================================================================

// --- Importação de Módulos ---

// Carrega as variáveis de ambiente do arquivo .env (deve ser a primeira linha)
require('dotenv').config();

const { chromium } = require('playwright');
const fs = require('fs');

// Importa as configurações (URLs e Seletores) do arquivo externo
const { GOV_URLS, SELECTORS } = require('./config.js');

// --- Fim da Importação ---


// --- Variáveis Globais ---

// Pega as credenciais do arquivo .env. Se não existirem, define como nulas.
const LOGIN_CREDENCIALS = {
    user: process.env.LOGIN_USER,
    password: process.env.LOGIN_PASSWORD,
};

// --- Fim das Variáveis Globais ---


/**
 * ===============================================================================================
 * FUNÇÃO DE PREENCHIMENTO INTELIGENTE
 * ===============================================================================================
 * Detecta o tipo de campo (texto, select, radio) e usa o método correto do Playwright.
 *
 * @param {object} page - O objeto da página do Playwright.
 * @param {string} key - A chave do campo (ex: 'medico-cpf').
 * @param {string} selector - O seletor CSS do elemento no site.
 * @param {string} value - O valor a ser preenchido (vindo do dados.json).
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
            if (tagName === 'input') {
                return element.type.toLowerCase() || 'text';
            }
            return tagName;
        }, selector);

        if (!elementType) {
            console.warn(`\x1b[33m%s\x1b[0m`, `  - AVISO: Campo "${key}" não encontrado no site com o seletor "${selector}".`);
            return;
        }

        switch (elementType) {
            case 'select':
                await page.selectOption(selector, { value: value });
                console.log(`  - [Select] Campo "${key}" preenchido.`);
                break;
            case 'radio':
                await page.check(`${selector}[value="${value}"]`);
                console.log(`  - [Radio] Campo "${key}" preenchido com a opção "${value}".`);
                break;
            case 'checkbox':
                if (value && value.toLowerCase() !== 'nao' && value.toLowerCase() !== 'off') {
                    await page.check(selector);
                    console.log(`  - [Checkbox] Campo "${key}" marcado.`);
                } else {
                    await page.uncheck(selector);
                    console.log(`  - [Checkbox] Campo "${key}" desmarcado.`);
                }
                break;
            default:
                await page.fill(selector, value);
                console.log(`  - [Texto] Campo "${key}" preenchido com "${value}".`);
                break;
        }
    } catch (e) {
        console.error('\x1b[31m%s\x1b[0m', `  - ERRO ao preencher o campo "${key}" (seletor: ${selector}).\n    Detalhes: ${e.message}`);
    }
}


/**
 * ===============================================================================================
 * FUNÇÃO PRINCIPAL DO ROBÔ (MAIN)
 * ===============================================================================================
 */
async function runAutomation() {
    // Validação inicial das configurações
    if (!LOGIN_CREDENCIALS.user || LOGIN_CREDENCIALS.user === 'SEU_USUARIO_AQUI' || !GOV_URLS.login || GOV_URLS.login === 'URL_DA_PAGINA_DE_LOGIN_AQUI') {
        console.error('\x1b[31m%s\x1b[0m', 'ERRO: As informações de configuração precisam ser preenchidas nos arquivos ".env" e "config.js".');
        console.error('Por favor, siga as instruções no arquivo README.md.');
        return;
    }

    console.log('\x1b[34m%s\x1b[0m', '▶ Iniciando o robô de automação...');

    // 1. Ler os dados do arquivo JSON
    let formData;
    try {
        console.log('Lendo o arquivo "dados.json"...');
        const fileContent = fs.readFileSync('dados.json', 'utf-8');
        formData = JSON.parse(fileContent);
        console.log('\x1b[32m%s\x1b[0m', '✔ Arquivo "dados.json" lido com sucesso!');
    } catch (error) {
        console.error('\x1b[31m%s\x1b[0m', 'ERRO: Não foi possível ler o arquivo "dados.json". Certifique-se de que ele está na mesma pasta e foi gerado corretamente.');
        return;
    }

    // 2. Iniciar o navegador
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        // 3. Processo de Login
        console.log(`Navegando para a página de login...`);
        await page.goto(GOV_URLS.login);
        console.log('Preenchendo credenciais...');
        await page.fill(SELECTORS.userField, LOGIN_CREDENCIALS.user);
        await page.fill(SELECTORS.passwordField, LOGIN_CREDENCIALS.password);
        console.log('Realizando login...');
        await page.click(SELECTORS.loginButton);
        await page.waitForNavigation();
        console.log('\x1b[32m%s\x1b[0m', '✔ Login realizado com sucesso!');

        // 4. Navegar até o formulário (se necessário)
        if (GOV_URLS.form && GOV_URLS.form !== GOV_URLS.login) {
            console.log(`Navegando para a página do formulário...`);
            await page.goto(GOV_URLS.form);
        }

        // 5. Preencher o formulário
        console.log('Iniciando o preenchimento dos campos do formulário...');
        for (const [key, value] of Object.entries(formData)) {
            const selector = SELECTORS.fields[key];
            if (selector && value) {
                await fillFieldSmartly(page, key, selector, value);
            }
        }
        console.log('\x1b[32m%s\x1b[0m', '✔ Preenchimento do formulário concluído.');

        // 6. Enviar o formulário
        console.log('Clicando no botão para salvar o formulário...');
        await page.click(SELECTORS.saveFormButton);
        console.log('\x1b[32m%s\x1b[0m', '✔ Formulário enviado com sucesso!');

        console.log('\n\x1b[32m%s\x1b[0m', '🎉 Automação concluída com sucesso! O navegador permanecerá aberto para sua verificação. Pode fechá-lo manualmente.');

    } catch (error) {
        console.error('\x1b[31m%s\x1b[0m', '\nERRO DURANTE A EXECUÇÃO DA AUTOMAÇÃO:');
        console.error(error);
    } finally {
        // Deixar o navegador aberto para verificação.
        // Para fechar automaticamente, descomente a linha abaixo:
        // await browser.close();
    }
}

// Inicia a execução do robô
runAutomation();