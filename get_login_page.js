const { chromium } = require('playwright');

async function getLoginPageHtml() {
  // A URL exata que você forneceu.
  const loginUrl = 'https://acesso.unasus.gov.br/idp/module.php/core/loginuserpass.php?AuthState=_4998788f4470ec3c51fda98f29c226b296392a95fd%3Ahttps%3A%2F%2Facesso.unasus.gov.br%2Fidp%2Fsaml2%2Fidp%2FSSOService.php%3Fspentityid%3Dsistemas.unasus.gov.br%26RelayState%3Dcookie%253A1759068573_d763%26cookieTime%3D1759068573';

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // 1. Vai diretamente para a página de login final
    await page.goto(loginUrl);

    // 2. Aguarda um seletor que seja provável de estar na página de login
    // (vamos apostar em 'username' ou 'password' como parte do ID/nome)
    await page.waitForSelector('input[name="username"]', { timeout: 10000 });

    // 3. Captura o HTML da página
    const html = await page.content();
    console.log(html);

  } catch (error) {
    console.error("Erro ao tentar obter o HTML da página de login com Playwright:", error);
  } finally {
    await browser.close();
  }
}

getLoginPageHtml();