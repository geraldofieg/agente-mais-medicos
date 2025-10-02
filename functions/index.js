const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.createSupervisor = functions.https.onCall(async (data, context) => {
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

    try {
        // Cria o usuário no Firebase Authentication
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
        });

        // Define uma custom claim para identificar o usuário como supervisor
        await admin.auth().setCustomUserClaims(userRecord.uid, { supervisor: true });

        console.log(`Supervisor criado com sucesso: ${email} (UID: ${userRecord.uid})`);

        return { success: true, message: `Supervisor ${email} registrado com sucesso.` };

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

exports.listSupervisors = functions.https.onCall(async (data, context) => {
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

exports.deleteSupervisor = functions.https.onCall(async (data, context) => {
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