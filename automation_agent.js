// =================================================================================================
// AGENTE DE AUTOMAÇÃO PARA PREENCHIMENTO DO FORMULÁRIO "MAIS MÉDICOS"
// =================================================================================================
//
// COMO USAR:
// 1. Instale o Node.js e o Playwright no seu computador (instruções estarão no README.md).
// 2. Coloque este arquivo na mesma pasta onde você baixou o "dados.json" da nossa página web.
// 3. Preencha as informações de configuração abaixo (URL, seletores, login e senha).
// 4. Abra o terminal ou prompt de comando, navegue até a pasta e execute: node automation_agent.js
//
// =================================================================================================

const { chromium } = require('playwright');
const fs = require('fs');

// --- ETAPA DE CONFIGURAÇÃO (INFORMAÇÕES SENSÍVEIS E TÉCNICAS) ---
// IMPORTANTE: Estas informações precisam ser preenchidas com os dados corretos do site do governo.

// 1. Credenciais de Acesso
const LOGIN_CREDENCIALS = {
    user: 'SEU_USUARIO_AQUI',
    password: 'SUA_SENHA_AQUI'
};

// 2. URLs
const GOV_URLS = {
    login: 'URL_DA_PAGINA_DE_LOGIN_AQUI',
    form: 'URL_DA_PAGINA_DO_FORMULARIO_APOS_LOGIN'
};

// 3. Seletores de Elementos (os "endereços" dos campos no site)
// Estes são os identificadores únicos de cada campo no HTML do site do governo.
const SELECTORS = {
    userField: '#ID_DO_CAMPO_DE_USUARIO_AQUI',
    passwordField: '#ID_DO_CAMPO_DE_SENHA_AQUI',
    loginButton: '#ID_DO_BOTAO_DE_LOGIN_AQUI',

    // Mapeamento dos campos do nosso formulário para os seletores do site do governo
    fields: {
        'medico-nome': '#seletor_para_nome_do_medico',
        'medico-cpf': '#seletor_para_cpf_do_medico',
        'data-supervisao': '#seletor_para_data_supervisao',
        // ... e assim por diante para TODOS os outros campos.
        // Este mapa é a parte mais crítica e precisa ser preenchido cuidadosamente.
    },

    saveFormButton: '#ID_DO_BOTAO_SALVAR_NO_SITE_DO_GOVERNO'
};

// --- FIM DA ETAPA DE CONFIGURAÇÃO ---

/**
 * ===============================================================================================
 * FUNÇÃO DE PREENCHIMENTO INTELIGENTE
 * ===============================================================================================
 * Esta função detecta o tipo de campo do formulário (texto, select, radio) e usa o método
 * correto do Playwright para preenchê-lo. Isso torna o robô mais robusto.
 *
 * @param {object} page - O objeto da página do Playwright.
 * @param {string} key - A chave do campo (ex: 'medico-cpf'), usada para logs.
 * @param {string} selector - O seletor CSS do elemento no site do governo.
 * @param {string} value - O valor a ser preenchido, vindo do arquivo dados.json.
 * ===============================================================================================
 */
async function fillFieldSmartly(page, key, selector, value) {
    try {
        // Usa page.evaluate para descobrir o tipo do elemento no navegador
        const elementType = await page.evaluate(sel => {
            const element = document.querySelector(sel);
            if (!element) return null; // Retorna nulo se o elemento não for encontrado

            const tagName = element.tagName.toLowerCase();
            if (tagName === 'select') return 'select';
            if (tagName === 'textarea') return 'textarea'; // Trata textarea como um campo de texto normal
            if (tagName === 'input') {
                return element.type.toLowerCase() || 'text'; // Retorna o tipo do input (text, radio, etc.)
            }
            return tagName;
        }, selector);

        if (!elementType) {
            console.warn(`\x1b[33m%s\x1b[0m`, `  - AVISO: Campo "${key}" não encontrado no site com o seletor "${selector}".`);
            return;
        }

        // Com base no tipo, executa a ação correta
        switch (elementType) {
            case 'select':
                await page.selectOption(selector, { value: value });
                console.log(`  - [Select] Campo "${key}" preenchido com a opção de valor "${value}".`);
                break;

            case 'radio':
                // Para radio buttons, o seletor deve apontar para o grupo (ex: 'input[name="nome-do-grupo"]')
                // e o `value` do JSON deve corresponder ao `value` da opção desejada.
                await page.check(`${selector}[value="${value}"]`);
                console.log(`  - [Radio] Campo "${key}" preenchido com a opção de valor "${value}".`);
                break;

            case 'checkbox':
                // Marca o checkbox se o valor for "truthy" (ex: 'Sim', 'on', true)
                if (value && value !== 'Nao' && value !== 'off' && value !== false) {
                    await page.check(selector);
                    console.log(`  - [Checkbox] Campo "${key}" marcado.`);
                } else {
                    await page.uncheck(selector);
                    console.log(`  - [Checkbox] Campo "${key}" desmarcado.`);
                }
                break;

            // Casos padrão para campos de texto
            case 'text':
            case 'email':
            case 'tel':
            case 'date':
            case 'time':
            case 'textarea':
            default:
                await page.fill(selector, value);
                console.log(`  - [Texto] Campo "${key}" preenchido com "${value}".`);
                break;
        }
    } catch (e) {
        console.error('\x1b[31m%s\x1b[0m', `  - ERRO ao preencher o campo "${key}" (seletor: ${selector}).\n    Detalhes: ${e.message}`);
    }
}


// Função principal do robô
async function runAutomation() {
    // Validação inicial
    if (GOV_URLS.login === 'URL_DA_PAGINA_DE_LOGIN_AQUI' || LOGIN_CREDENCIALS.user === 'SEU_USUARIO_AQUI') {
        console.error('\x1b[31m%s\x1b[0m', 'ERRO: As informações de configuração (URL, login, senha e seletores) precisam ser preenchidas no topo deste arquivo.');
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
        console.error('\x1b[31m%s\x1b[0m', 'ERRO: Não foi possível ler o arquivo "dados.json". Certifique-se de que ele está na mesma pasta que este script.');
        return;
    }

    // 2. Iniciar o navegador
    const browser = await chromium.launch({ headless: false }); // Usar 'headless: false' para ver o robô em ação
    const page = await browser.newPage();

    try {
        // 3. Processo de Login
        console.log(`Navegando para a página de login: ${GOV_URLS.login}`);
        await page.goto(GOV_URLS.login);
        console.log('Preenchendo credenciais...');
        await page.fill(SELECTORS.userField, LOGIN_CREDENCIALS.user);
        await page.fill(SELECTORS.passwordField, LOGIN_CREDENCIALS.password);
        console.log('Realizando login...');
        await page.click(SELECTORS.loginButton);
        await page.waitForNavigation();
        console.log('\x1b[32m%s\x1b[0m', '✔ Login realizado com sucesso!');

        // 4. Navegar até o formulário (se for uma página diferente)
        if (GOV_URLS.form && GOV_URLS.form !== GOV_URLS.login) {
            console.log(`Navegando para a página do formulário: ${GOV_URLS.form}`);
            await page.goto(GOV_URLS.form);
        }

        // 5. Preencher o formulário usando a lógica inteligente
        console.log('Iniciando o preenchimento dos campos do formulário...');
        for (const [key, value] of Object.entries(formData)) {
            const selector = SELECTORS.fields[key];
            // Só processa se houver um seletor mapeado e um valor não-nulo/vazio
            if (selector && value) {
                await fillFieldSmartly(page, key, selector, value);
            }
        }
        console.log('\x1b[32m%s\x1b[0m', '✔ Preenchimento do formulário concluído.');

        // 6. Enviar o formulário
        console.log('Clicando no botão para salvar o formulário...');
        await page.click(SELECTORS.saveFormButton);
        console.log('\x1b[32m%s\x1b[0m', '✔ Formulário enviado com sucesso!');

        console.log('\n\x1b[32m%s\x1b[0m', '🎉 Automação concluída com sucesso! Pode fechar esta janela.');

    } catch (error) {
        console.error('\x1b[31m%s\x1b[0m', '\nERRO DURANTE A EXECUÇÃO DA AUTOMAÇÃO:');
        console.error(error);
    } finally {
        // Deixamos o navegador aberto por um tempo para o usuário ver o resultado
        // await browser.close();
    }
}

// Inicia a execução do robô
runAutomation();