# Ferramenta de Automação de Relatórios - Mais Médicos (Versão Melhorada)

Olá! Esta é uma ferramenta simples criada para facilitar e agilizar o preenchimento dos seus relatórios mensais do programa Mais Médicos.

O objetivo é simples: em vez de preencher o formulário completo no site do governo todo mês, você usará uma página local onde a maioria dos dados já estará salva. Você só precisará conferir as informações, ajustar o que for necessário, e então um "robô" fará o trabalho de preenchimento no site do governo para você.

## Como Funciona

A solução é dividida em duas partes principais:

1.  **A Página Web (`index.html`)**: É um formulário local que você abre no seu navegador. Nela, você cadastra os dados dos médicos supervisionados. A página salva essas informações no seu próprio computador (`localStorage`). Mensalmente, você a usará para gerar um arquivo chamado `dados.json`.
2.  **O Robô de Automação (`automation_agent.js`)**: É um script que lê o arquivo `dados.json`, abre o site do governo, faz o login com suas credenciais e preenche o relatório automaticamente.

---

## 1. Configuração Inicial (Feita apenas uma vez)

Siga estes passos para preparar seu computador. Leva apenas alguns minutos.

### Passo 1: Instalar o Node.js

Node.js é a plataforma que permite que nosso robô funcione. Se você já o tem instalado, pode pular esta etapa.

1.  Acesse o site: [https://nodejs.org/](https://nodejs.org/)
2.  Baixe a versão **LTS** (marcada como "Recomendado para a maioria dos usuários").
3.  Execute o instalador e siga as instruções (pode apenas clicar em "Avançar" em todas as etapas).

### Passo 2: Baixar e Preparar os Arquivos da Ferramenta

1.  Crie uma pasta em um local de fácil acesso no seu computador (ex: `C:\Usuarios\SeuNome\Documentos\AutomacaoRelatorios`).
2.  Baixe **todos** os arquivos do projeto e coloque-os dentro desta pasta.
    *   `index.html`
    *   `scripts.js`
    *   `style.css`
    *   `automation_agent.js`
    *   `config.js`
    *   `package.json`
    *   `.env` (se este arquivo não veio, renomeie `env.example` para `.env` ou crie-o)

### Passo 3: Instalar as Dependências do Robô

1.  Abra o **Prompt de Comando** (no Windows, pesquise por `cmd` no Menu Iniciar) ou o **Terminal** (no Mac).
2.  Navegue até a pasta que você criou no passo anterior. Use o comando `cd` seguido do caminho da pasta. Exemplo:
    *   `cd Documentos/AutomacaoRelatorios`
3.  Agora, execute o seguinte comando para instalar tudo o que o robô precisa (incluindo os navegadores):
    ```bash
    npm run install-deps
    ```
    Aguarde a conclusão. Este comando pode levar alguns minutos.

### Passo 4: Configurar Suas Informações (A parte mais importante!)

Diferente da versão antiga, suas informações agora ficam em arquivos de configuração separados, o que é mais seguro e organizado.

1.  **Preencha suas Credenciais (Arquivo `.env`)**:
    *   Abra o arquivo `.env` com um editor de texto simples (como o Bloco de Notas).
    *   Substitua `SEU_USUARIO_AQUI` e `SUA_SENHA_AQUI` com seu usuário e senha reais do site do governo.
    *   **Exemplo:**
        ```
        LOGIN_USER="meu.usuario"
        LOGIN_PASSWORD="minhasenha123"
        ```
    *   Salve e feche o arquivo. **Nunca compartilhe este arquivo com ninguém!**

2.  **Configure as URLs e Seletores (Arquivo `config.js`)**:
    *   Abra o arquivo `config.js`.
    *   Você precisará preencher as URLs do site do governo e os seletores de cada campo do formulário.
    *   **`GOV_URLS`**: Cole as URLs exatas da página de login e da página do formulário.
    *   **`SELECTORS`**: Esta é a parte mais técnica. Os seletores são os "endereços" de cada campo no site. Você precisará inspecionar o código-fonte do site do governo para encontrá-los (geralmente clicando com o botão direito no campo e selecionando "Inspecionar"). Se precisar de ajuda, contate o desenvolvedor.

---

## 2. Como Usar no Dia a Dia (Processo Mensal)

Depois da configuração inicial, seu processo mensal será muito rápido:

1.  **Abra a Página Web**: Dê um duplo clique no arquivo `index.html`. Ele abrirá no seu navegador.

2.  **Cadastre ou Selecione o Médico**:
    *   Para um médico novo, preencha o formulário.
    *   Para um médico já cadastrado, selecione-o na lista para carregar seus dados.

3.  **Preencha e Exporte**: Preencha os campos que mudam todo mês (como a data da supervisão) e clique no botão **"Salvar e Exportar Dados para Automação"**.

4.  **Salve o `dados.json`**: O navegador fará o download de um arquivo chamado `dados.json`. **Salve-o na mesma pasta** onde estão os outros arquivos da ferramenta.

5.  **Execute o Robô**:
    *   Abra o Prompt de Comando/Terminal na pasta da ferramenta (como você fez na instalação).
    *   Digite o seguinte comando e pressione Enter:
        ```bash
        npm start
        ```

Pronto! Uma janela do navegador se abrirá e você verá o robô preenchendo o formulário por você. A janela permanecerá aberta para que você possa verificar se tudo foi preenchido corretamente.