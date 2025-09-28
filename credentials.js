// Importa as funções do Firestore e do Auth
import { db, app } from './firebase-config.js';
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const auth = getAuth(app);

// --- GATEKEEPER ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Usuário está logado, podemos carregar a lógica da página.
        initializeCredentialsPage(user);
    } else {
        // Usuário não está logado, redireciona para o login.
        window.location.href = 'login.html';
    }
});

function initializeCredentialsPage(currentUser) {
    const credentialsForm = document.getElementById('credentials-form');
    const govLoginInput = document.getElementById('gov-login');
    const feedbackMessageDiv = document.getElementById('feedback-message');
    const logoutBtn = document.getElementById('logout-btn-creds');

    // --- Lógica de Logout ---
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.href = 'login.html';
        }).catch((error) => {
            console.error("Erro no logout:", error);
        });
    });

    // Referência para o documento de credenciais do supervisor
    // O ID do documento é o mesmo ID do usuário, garantindo uma ligação 1-para-1.
    const credsDocRef = doc(db, 'supervisor_credentials', currentUser.uid);

    // --- Carregar Credenciais Salvas ---
    getDoc(credsDocRef).then((docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            // Preenche o campo de login para o usuário ver o que está salvo.
            // A senha não é preenchida por segurança.
            govLoginInput.value = data.login || '';
            console.log("Credenciais de login do governo carregadas.");
        } else {
            console.log("Nenhuma credencial do governo salva para este usuário ainda.");
        }
    }).catch(error => {
        console.error("Erro ao carregar credenciais:", error);
        feedbackMessageDiv.textContent = "Erro ao carregar suas informações.";
        feedbackMessageDiv.className = 'feedback-text error-text';
        feedbackMessageDiv.classList.remove('hidden');
    });


    // --- Salvar Credenciais ---
    credentialsForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const login = credentialsForm['gov-login'].value;
        const password = credentialsForm['gov-password'].value;

        // Codifica a senha em Base64. Não é criptografia forte, mas evita
        // que a senha seja armazenada em texto puro no banco de dados.
        const encodedPassword = btoa(password);

        const credentialsData = {
            login: login,
            encodedPassword: encodedPassword, // Salva a senha codificada
            updatedAt: new Date().toISOString()
        };

        setDoc(credsDocRef, credentialsData)
            .then(() => {
                console.log("Credenciais salvas com sucesso!");
                feedbackMessageDiv.textContent = "Suas credenciais foram salvas com sucesso!";
                feedbackMessageDiv.className = 'feedback-text success-text';
                feedbackMessageDiv.classList.remove('hidden');

                // Limpa a mensagem após alguns segundos
                setTimeout(() => {
                    feedbackMessageDiv.classList.add('hidden');
                }, 4000);

                // Limpa o campo de senha após salvar
                credentialsForm['gov-password'].value = '';

            })
            .catch((error) => {
                console.error("Erro ao salvar credenciais:", error);
                feedbackMessageDiv.textContent = "Ocorreu um erro ao salvar. Tente novamente.";
                feedbackMessageDiv.className = 'feedback-text error-text';
                feedbackMessageDiv.classList.remove('hidden');
            });
    });
}