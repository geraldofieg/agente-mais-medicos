# Ferramenta de Automação de Relatórios - Mais Médicos (Versão 2.0 com Firebase)

## Visão Geral

Bem-vindo à versão 2.0 da Ferramenta de Automação de Relatórios! Esta versão foi completamente modernizada para ser mais robusta, segura e fácil de usar. Eliminamos a necessidade de baixar e gerenciar arquivos `dados.json` manualmente. Agora, a ferramenta usa o **Firebase**, um banco de dados em nuvem do Google, para centralizar todas as informações.

**Principais Vantagens da Nova Versão:**
*   **Acesso de Qualquer Lugar:** Sua lista de médicos supervisionados fica salva na nuvem. Acesse e gerencie de qualquer computador ou dispositivo.
*   **Fluxo de Trabalho Simplificado:** Não há mais download de arquivos. Clique em "Enviar para Automação" e o robô cuidará do resto.
*   **Automação Inteligente:** O robô fica "escutando" por novos relatórios e os processa em tempo real, sem precisar ser iniciado manualmente para cada relatório.
*   **Mais Segurança:** As credenciais e chaves de acesso são gerenciadas de forma mais segura.

---

## 1. Configuração Inicial (Feita apenas uma vez)

Siga estes passos para preparar seu ambiente. Leva cerca de 10-15 minutos.

### Passo 1: Instalar o Node.js

Node.js é a plataforma que permite que nosso robô funcione.
1.  Acesse: [https://nodejs.org/](https://nodejs.org/)
2.  Baixe e instale a versão **LTS**.

### Passo 2: Configurar o Projeto Firebase

Esta é a etapa mais importante. Vamos criar o banco de dados na nuvem.

1.  **Crie o Projeto no Firebase:**
    *   Acesse o [Console do Firebase](https://console.firebase.google.com/) com sua conta do Google.
    *   Clique em **"Adicionar projeto"**, dê um nome (ex: `automacao-maismedicos`) e siga as instruções (pode desativar o Google Analytics).

2.  **Crie o Banco de Dados (Firestore):**
    *   Dentro do seu projeto, no menu esquerdo, clique em **Construir > Firestore Database**.
    *   Clique em **"Criar banco de dados"**.
    *   Selecione **"Iniciar em modo de produção"** e clique em "Avançar".
    *   Escolha um local para o servidor (pode manter o padrão) e clique em **"Ativar"**.
    *   Vá para a aba **"Regras"** e altere `allow read, write: if false;` para `allow read, write: if true;` e clique em **"Publicar"**. Isso é para simplificar o desenvolvimento inicial.

3.  **Obtenha a Chave da Interface (`firebase-config.js`):**
    *   Volte para a tela principal do projeto, clique no ícone de engrenagem > **Configurações do projeto**.
    *   Na aba "Geral", role para baixo e clique no ícone da web (`</>`) para "Adicionar um app da Web".
    *   Dê um apelido (ex: "Interface do Supervisor") e clique em **"Registrar app"**.
    *   O Firebase mostrará um objeto `firebaseConfig`. **Copie este objeto.**
    *   No seu código, cole esse objeto dentro do arquivo `firebase-config.js`, substituindo o conteúdo existente se necessário.

4.  **Obtenha a Chave do Robô (`firebase-service-account.json`):**
    *   Nas **Configurações do projeto**, vá para a aba **"Contas de serviço"**.
    *   Clique em **"Gerar nova chave privada"** e confirme.
    *   Um arquivo `.json` será baixado. **Renomeie-o para `firebase-service-account.json`** e mova-o para a pasta raiz do seu projeto. **NÃO COMPARTILHE ESTE ARQUIVO!**

### Passo 3: Preparar os Arquivos Locais

1.  Baixe todos os arquivos do projeto para uma pasta no seu computador.
2.  Abra um terminal (Prompt de Comando ou PowerShell) nessa pasta e execute:
    ```bash
    npm install
    ```
    Isso instalará todas as dependências, incluindo Playwright.

### Passo 4: Configurar Credenciais e URLs

1.  **Arquivo `.env`**: Crie um arquivo chamado `.env` na raiz do projeto. Dentro dele, adicione suas credenciais:
    ```
    LOGIN_USER="seu.usuario.gov"
    LOGIN_PASSWORD="sua-senha-super-secreta"
    ```
2.  **Arquivo `config.js`**: Abra o `config.js` e preencha as URLs do site do governo e os seletores CSS de cada campo do formulário.

---

## 2. Como Usar no Dia a Dia

O processo agora é muito mais simples.

### Parte 1: O Supervisor (Você)

1.  **Abra a Interface**: Abra o arquivo `index.html` no seu navegador.
2.  **Gerencie os Médicos**: Use o botão "Cadastrar/Editar Médicos" para adicionar ou atualizar as informações da sua equipe. Esses dados ficam salvos na nuvem.
3.  **Preencha o Relatório**:
    *   Selecione o médico na lista.
    *   Preencha os campos do relatório mensal.
    *   Clique em **"Enviar Relatório para Automação"**.

É isso! O relatório foi enviado para a "fila" de processamento no Firebase.

### Parte 2: O Robô (Automático)

Para que a mágica aconteça, o robô precisa estar em execução. Você pode iniciá-lo e deixá-lo rodando em segundo plano.

1.  **Inicie o Robô**: No terminal, na pasta do projeto, execute:
    ```bash
    node automation_agent.js
    ```
2.  **Monitore**: O terminal mostrará a mensagem "Aguardando por novos relatórios...".
3.  **Ação!**: Assim que você enviar um relatório pela interface, o robô irá detectá-lo, abrir o navegador, preencher tudo e atualizar o status no Firebase para "completed" ou "failed". Você pode acompanhar o progresso pelo terminal.

Você só precisa iniciar o robô uma vez por sessão de trabalho. Ele continuará monitorando até que você feche o terminal.