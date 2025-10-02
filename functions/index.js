const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.createSupervisor = functions.https.onCall(async (data, context) => {
    // Para maior segurança, adicione uma verificação para garantir que apenas
    // usuários autorizados (ex: outros supervisores ou administradores) possam chamar esta função.
    // if (!context.auth) {
    //     throw new functions.https.HttpsError('unauthenticated', 'Você precisa estar autenticado para realizar esta ação.');
    // }

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