# Ferramenta de Automação de Relatórios - Mais Médicos

Olá! Esta é uma ferramenta simples criada para facilitar e agilizar o preenchimento dos seus relatórios mensais do programa Mais Médicos.

O objetivo é simples: em vez de preencher o formulário completo no site do governo todo mês, você usará uma página local onde a maioria dos dados já estará salva. Você só precisará conferir as informações, ajustar o que for necessário, e então um "robô" fará o trabalho de preenchimento no site do governo para você.

## Como Funciona

A solução é dividida em duas partes:

1.  **A Página Web (`index.html`)**: É um formulário local, que você abre no seu navegador. Nela, você cadastra os dados dos seus médicos supervisionados. A página salva essas informações no seu próprio computador. Mensalmente, você a usará para gerar um arquivo chamado `dados.json`, que contém as informações do relatório daquele mês.
2.  **O Robô de Automação (`automation_agent.js`)**: É um script que você executa no seu computador. Ele lê o arquivo `dados.json` que a página gerou, abre o site do governo, faz o login com suas credenciais e preenche o relatório automaticamente.

---

## 1. Configuração Inicial (Feita apenas uma vez)

Antes do primeiro uso, precisamos preparar o seu computador. Leva apenas alguns minutos.

### Passo 1: Instalar o Node.js

Node.js é uma plataforma que permite que o nosso robô funcione.

1.  Acesse o site: [https://nodejs.org/](https://nodejs.org/)
2.  Baixe a versão **LTS** (a que tem o texto "Recomendado para a maioria dos usuários").
3.  Execute o arquivo que você baixou e siga as instruções de instalação (pode apenas clicar em "Avançar" em todas as etapas).

### Passo 2: Baixar os Arquivos da Ferramenta

1.  Crie uma pasta em um local de fácil acesso no seu computador (por exemplo, na sua "Área de Trabalho" ou em "Documentos") e dê a ela um nome simples, como `AutomacaoRelatorios`.
2.  Baixe os três arquivos que compõem esta ferramenta (`index.html`, `scripts.js`, `automation_agent.js`) e coloque-os dentro desta pasta.

### Passo 3: Instalar o Robô (Playwright)

Agora, vamos instalar as "peças" que o robô precisa para funcionar.

1.  Abra o **Prompt de Comando** (no Windows, você pode pesquisar por `cmd` no Menu Iniciar) ou o **Terminal** (no Mac).
2.  Navegue até a pasta que você criou. Para isso, digite `cd` seguido do caminho da sua pasta. Exemplo:
    *   `cd Desktop/AutomacaoRelatorios`
3.  Com o terminal aberto na pasta correta, digite o seguinte comando e pressione Enter:
    ```bash
    npm install playwright
    ```
4.  Aguarde a conclusão da instalação. Em seguida, instale os navegadores que o robô usará com este comando:
    ```bash
    npx playwright install
    ```

### Passo 4: Configurar o Robô (A parte mais importante!)

Esta etapa é crucial e também só precisa ser feita uma vez (a menos que o site do governo mude).

1.  Abra o arquivo `automation_agent.js` com um editor de texto simples (como o Bloco de Notas).
2.  Você verá uma seção chamada **"ETAPA DE CONFIGURAÇÃO"**. Você precisará preencher as informações que estão marcadas com `SEU_USUARIO_AQUI`, `URL_..._AQUI`, etc.
    *   **LOGIN_CREDENCIALS**: Insira seu usuário e senha do site do governo.
    *   **GOV_URLS**: Insira a URL exata da página de login e, se houver, da página onde o formulário fica.
    *   **SELECTORS**: Esta é a parte mais técnica. Precisamos dos "endereços" (seletores) de cada campo do formulário no site do governo. Precisaremos preencher isso juntos, inspecionando o código da página do governo.

---

## 2. Como Usar no Dia a Dia (Processo Mensal)

Depois que a configuração inicial estiver pronta, seu processo mensal será muito mais rápido:

1.  **Abra a Página Web**: Vá até a pasta `AutomacaoRelatorios` e dê um duplo clique no arquivo `index.html`. Ele abrirá no seu navegador como uma página normal.

2.  **Selecione o Médico**:
    *   Se você já cadastrou o médico antes, selecione o nome dele na lista suspensa no topo da página. O formulário será preenchido automaticamente com os dados dele.
    *   Se for um médico novo, apenas preencha o formulário.

3.  **Preencha/Ajuste os Dados**: Preencha os campos que mudam todo mês (como a data da supervisão) e confira se os outros dados estão corretos.

4.  **Exporte os Dados**: Quando tudo estiver pronto, clique no botão **"Salvar e Exportar Dados para Automação"**. O navegador fará o download de um arquivo chamado `dados.json`. **Certifique-se de que este arquivo seja salvo na mesma pasta** `AutomacaoRelatorios`.

5.  **Execute o Robô**:
    *   Abra o Prompt de Comando/Terminal novamente e navegue até a pasta `AutomacaoRelatorios`.
    *   Digite o seguinte comando e pressione Enter:
        ```bash
        node automation_agent.js
        ```

Pronto! Uma janela do navegador se abrirá e você verá o robô trabalhando, preenchendo o formulário por você.