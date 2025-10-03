const functions = require("firebase-functions");
const admin = require("firebase-admin");
const puppeteer = require("puppeteer");
const cors = require('cors')({origin: true});

admin.initializeApp();

exports.createSupervisor = functions.region('southamerica-east1').runWith({
    timeoutSeconds: 300, // Aumenta o timeout para acomodar o web scraping
    memory: '1GB',       // Aloca mais memória para o Puppeteer
}).https.onCall(async (data, context) => {
    // Verificação de autenticação e permissão de administrador
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Você precisa estar autenticado para realizar esta ação.');
    }

    const adminEmail = "geraldofieg@gmail.com";
    const userEmail = context.auth.token.email;
    let claims = context.auth.token;

    // Lógica para promover o primeiro administrador
    if (userEmail === adminEmail && !claims.admin) {
        // Define as claims de admin e supervisor para o administrador
        await admin.auth().setCustomUserClaims(context.auth.uid, { admin: true, supervisor: true });
        // Atualiza as claims no token para a chamada atual
        claims = { ...claims, admin: true, supervisor: true };
        console.log(`Usuário ${userEmail} promovido a administrador.`);
    }

    // Verifica se o usuário é administrador
    if (!claims.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Apenas administradores podem criar novos supervisores.');
    }

    const { email, password } = data;

    if (!email || !password) {
        throw new functions.https.HttpsError('invalid-argument', 'E-mail e senha são obrigatórios.');
    }

    let userRecord;
    try {
        // Etapa 1: Criar o usuário no Firebase Authentication
        userRecord = await admin.auth().createUser({
            email: email,
            password: password,
        });

        // Etapa 2: Definir a custom claim de supervisor
        await admin.auth().setCustomUserClaims(userRecord.uid, { supervisor: true });
        console.log(`Supervisor criado com sucesso: ${email} (UID: ${userRecord.uid})`);

        // Etapa 3: Tentar importar os médicos supervisionados
        try {
            const importResult = await scrapeAndStoreDoctors(userRecord.uid, email, password);
            console.log(`Importação para ${email} concluída. Médicos adicionados: ${importResult.doctorsAdded}.`);

            return {
                success: true,
                importStatus: 'success',
                message: `Supervisor ${email} registrado com sucesso e ${importResult.doctorsAdded} médicos foram importados.`,
                doctorsAdded: importResult.doctorsAdded
            };

        } catch (importError) {
            console.warn(`A conta do supervisor ${email} foi criada, mas a importação da UNA-SUS falhou.`, importError.message);
            // A conta foi criada, mas a importação falhou. Retorna sucesso com um aviso.
            return {
                success: true,
                importStatus: 'fail',
                message: `Sua conta foi criada, mas não foi possível conectar ao portal da UNA-SUS. Verifique suas credenciais e tente a importação manual mais tarde.`,
                errorDetails: importError.message // Envia a mensagem de erro para o frontend
            };
        }

    } catch (error) {
        // Log detalhado do erro para depuração no Firebase
        console.error("Erro detalhado ao criar supervisor:", JSON.stringify(error, null, 2));

        // Mapeia erros do Firebase para mensagens mais amigáveis
        if (error.code === 'auth/email-already-exists') {
            throw new functions.https.HttpsError('already-exists', 'Este e-mail já está em uso.', { originalCode: error.code });
        }
        if (error.code === 'auth/invalid-password') {
            throw new functions.https.HttpsError('invalid-argument', 'A senha é inválida. Deve ter no mínimo 6 caracteres.', { originalCode: error.code });
        }
        if (error.code === 'auth/configuration-not-found') {
            throw new functions.https.HttpsError('failed-precondition', 'O método de autenticação por E-mail/Senha não está habilitado no Firebase. Habilite-o no console do Firebase para continuar.', { originalCode: error.code });
        }

        // Para todos os outros erros, joga um erro genérico, mas mantém o log detalhado.
        throw new functions.https.HttpsError('internal', 'Ocorreu um erro interno ao criar o supervisor.', { originalCode: error.code || 'UNKNOWN' });
    }
});

exports.listSupervisors = functions.region('southamerica-east1').https.onCall(async (data, context) => {
    // Verificação de autenticação e permissão de administrador
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Você precisa estar autenticado para realizar esta ação.');
    }

    const adminEmail = "geraldofieg@gmail.com";
    const userEmail = context.auth.token.email;
    let claims = context.auth.token;

    // Lógica para promover o primeiro administrador
    if (userEmail === adminEmail && !claims.admin) {
        // Define as claims de admin e supervisor para o administrador
        await admin.auth().setCustomUserClaims(context.auth.uid, { admin: true, supervisor: true });
        // Atualiza as claims no token para a chamada atual
        claims = { ...claims, admin: true, supervisor: true };
        console.log(`Usuário ${userEmail} promovido a administrador.`);
    }

    // Apenas administradores podem listar supervisores
    if (!claims.admin) {
        // Retorna uma lista vazia para não administradores em vez de um erro,
        // para não expor a existência da função.
        console.log(`Usuário não administrador (${userEmail}) tentou listar supervisores. Retornando lista vazia.`);
        return { supervisors: [] };
    }

    try {
        const listUsersResult = await admin.auth().listUsers();
        const supervisors = listUsersResult.users
            .filter(user => user.customClaims && user.customClaims.supervisor === true)
            .map(user => ({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || 'N/A',
            }));

        return { supervisors };
    } catch (error) {
        console.error("Erro ao listar supervisores:", JSON.stringify(error, null, 2));
        throw new functions.https.HttpsError('internal', 'Ocorreu um erro interno ao buscar a lista de supervisores.');
    }
});

exports.deleteSupervisor = functions.region('southamerica-east1').https.onCall(async (data, context) => {
    // 1. Verificação de autenticação e permissão de administrador
    if (!context.auth || !context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Apenas administradores podem excluir supervisores.');
    }

    const { uid } = data;

    // 2. Validação do UID
    if (!uid) {
        throw new functions.https.HttpsError('invalid-argument', 'O UID do supervisor é obrigatório.');
    }

    // 3. Proteção contra autoexclusão
    if (uid === context.auth.uid) {
        throw new functions.https.HttpsError('invalid-argument', 'Um administrador não pode excluir a si mesmo.');
    }

    try {
        // 4. Excluir o usuário
        await admin.auth().deleteUser(uid);
        console.log(`Supervisor com UID: ${uid} foi excluído com sucesso por ${context.auth.token.email}`);
        return { success: true, message: 'Supervisor excluído com sucesso.' };
    } catch (error) {
        console.error(`Erro ao excluir supervisor com UID: ${uid}. Erro:`, JSON.stringify(error, null, 2));

        // 5. Tratamento de erros específicos
        if (error.code === 'auth/user-not-found') {
            throw new functions.https.HttpsError('not-found', 'O supervisor que você está tentando excluir não foi encontrado.');
        }

        // Erro genérico para outras falhas
        throw new functions.https.HttpsError('internal', 'Ocorreu um erro interno ao tentar excluir o supervisor.');
    }
});

/**
 * Função reutilizável para fazer o web scraping dos médicos supervisionados no portal da UNA-SUS.
 * @param {string} supervisorId - O UID do supervisor no Firebase.
 * @param {string} email - O e-mail de login para o portal da UNA-SUS.
 * @param {string} password - A senha de login para o portal da UNA-SUS.
 * @returns {Promise<{success: boolean, doctorsAdded: number}>} - Um objeto indicando o sucesso e o número de médicos adicionados.
 * @throws {functions.https.HttpsError} - Lança erros específicos para falhas de login ou scraping.
 */
async function scrapeAndStoreDoctors(supervisorId, email, password) {
    console.log(`Iniciando busca de dados da UNA-SUS para o supervisor: ${supervisorId}`);
    let browser = null;
    let doctorsAdded = 0;

    try {
        browser = await puppeteer.launch({ args: ['--no-sandbox'] });
        const page = await browser.newPage();

        const loginUrl = 'https://sistemas.unasus.gov.br/webportfolio/web/atividade/4/';
        console.log(`Navegando para: ${loginUrl}`);
        await page.goto(loginUrl, { waitUntil: 'networkidle2' });

        await page.type('#user_login', email);
        await page.type('#user_pass', password);

        console.log("Tentando fazer login na UNA-SUS...");
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            page.click('#wp-submit')
        ]);

        if (page.url().includes('wp-login.php')) {
            console.error(`Falha no login para o supervisor ${supervisorId} com email ${email}. Credenciais inválidas.`);
            throw new functions.https.HttpsError('permission-denied', 'Login ou senha inválidos no portal da UNA-SUS.');
        }
        console.log("Login na UNA-SUS bem-sucedido.");

        console.log("Extraindo dados dos médicos...");
        const supervisedDoctors = await page.evaluate(() => {
            const doctors = [];
            const doctorElements = document.querySelectorAll('select#IdPessoa option');
            doctorElements.forEach(option => {
                const text = option.innerText;
                if (option.value && text && text !== 'Selecione...') {
                    const parts = text.split(' - ');
                    const name = parts[0]?.trim();
                    const cpf = parts[1]?.trim().replace(/[^\d]/g, '');
                    if (name && cpf) {
                        doctors.push({ name, cpf });
                    }
                }
            });
            return doctors;
        });

        if (supervisedDoctors.length === 0) {
            console.warn("Nenhum médico encontrado na página para o supervisor:", supervisorId);
            throw new functions.https.HttpsError('not-found', 'Nenhum médico supervisionado foi encontrado no portal da UNA-SUS.');
        }
        console.log(`Encontrados ${supervisedDoctors.length} médicos.`);

        const db = admin.firestore();
        for (const doctor of supervisedDoctors) {
            const sanitizedCpf = doctor.cpf.replace(/[^\d]/g, '');
            if (sanitizedCpf.length !== 11) continue;

            const docRef = db.collection('doctors').doc(sanitizedCpf);
            const docSnap = await docRef.get();

            if (!docSnap.exists) {
                await docRef.set({
                    'medico-nome': doctor.name,
                    'medico-cpf': sanitizedCpf,
                    'supervisorId': supervisorId,
                    'medico-email': '',
                    'municipio-nome': '',
                    'municipio-uf': '',
                    'perfil-territorio': 'Perfil 02',
                    'localizacao-unidade': 'Urbana',
                    'modalidade-equipe': 'Estrategia Saude da Familia',
                    'createdAt': admin.firestore.FieldValue.serverTimestamp()
                });
                doctorsAdded++;
                console.log(`Médico adicionado: ${doctor.name} (${sanitizedCpf})`);
            } else {
                console.log(`Médico já existe: ${doctor.name} (${sanitizedCpf})`);
            }
        }

        console.log("Processo de busca de dados concluído.");
        return { success: true, doctorsAdded };

    } catch (error) {
        console.error("Erro detalhado durante o web scraping:", error.message);
        // Se o erro já for um HttpsError, propaga-o.
        if (error instanceof functions.https.HttpsError) {
            throw error;
        } else {
        // Para outros erros (ex: erros do Puppeteer), cria um erro com uma mensagem genérica
        // mas passa a mensagem de erro original no objeto 'details' para o cliente.
        throw new functions.https.HttpsError(
            'internal', // Código do erro
            'Ocorreu um erro no servidor ao buscar os dados da UNA-SUS. Verifique os logs para detalhes.', // Mensagem principal (genérica)
            { originalError: error.message } // Detalhes para o cliente
        );
        }
    } finally {
        if (browser) {
            await browser.close();
            console.log("Navegador fechado.");
        }
    }
}

// Nova versão da função com https.onRequest e tratamento de CORS
exports.importSupervisedDoctors = functions.region('southamerica-east1').runWith({
    timeoutSeconds: 300,
    memory: '1GB',
}).https.onRequest((req, res) => {
    // Envolve a lógica da função com o middleware CORS
    cors(req, res, async () => {
        // 1. Validação do método da requisição
        if (req.method !== 'POST') {
            return res.status(405).send('Method Not Allowed');
        }

        // 2. Verificação do token de autenticação
        const idToken = req.headers.authorization?.split('Bearer ')[1];
        if (!idToken) {
            return res.status(401).send({ error: 'unauthenticated', message: 'Token de autenticação não fornecido.' });
        }

        let decodedToken;
        try {
            decodedToken = await admin.auth().verifyIdToken(idToken);
        } catch (error) {
            console.error('Erro ao verificar o token:', error);
            return res.status(401).send({ error: 'unauthenticated', message: 'Token inválido ou expirado.' });
        }

        // 3. Verificação da permissão de supervisor
        if (!decodedToken.supervisor) {
            return res.status(403).send({ error: 'permission-denied', message: 'Apenas supervisores podem realizar esta ação.' });
        }

        // 4. Validação dos dados de entrada (do corpo da requisição)
        const { data } = req.body; // O Firebase SDK para callables envolve os dados em um objeto 'data'
        const { email, password } = data || req.body; // Aceita 'data' ou o corpo direto

        if (!email || !password) {
            return res.status(400).send({ error: 'invalid-argument', message: 'E-mail e senha do portal UNA-SUS são obrigatórios.' });
        }

        const supervisorId = decodedToken.uid;

        try {
            // 5. Execução da lógica de negócio
            const result = await scrapeAndStoreDoctors(supervisorId, email, password);
            // O SDK do cliente espera uma propriedade 'data' na resposta
            return res.status(200).send({ data: result });
        } catch (error) {
            // 6. Tratamento de erros da lógica de negócio
            console.error('Erro durante o scraping:', JSON.stringify(error, null, 2));
            // Mapeia HttpsError para respostas HTTP
            if (error.code && error.http) {
                 return res.status(error.http.status || 500).send({
                    error: {
                        code: `functions/${error.code}`,
                        message: error.message,
                        details: error.details,
                    }
                });
            }
            // Erro genérico
            return res.status(500).send({
                error: {
                    code: 'functions/internal',
                    message: 'Ocorreu um erro interno no servidor.',
                    details: error.message,
                }
            });
        }
    });
});