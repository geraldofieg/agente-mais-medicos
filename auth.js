// Importa as funções de autenticação do Firebase
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { app } from './firebase-config.js'; // Precisamos do `app` inicializado

// Inicializa o serviço de autenticação
const auth = getAuth(app);

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const errorMessageDiv = document.getElementById('error-message');

    // Função para exibir mensagens de erro
    function showAuthError(message) {
        errorMessageDiv.textContent = message;
        errorMessageDiv.classList.remove('hidden');
    }

    // A lógica de cadastro foi movida para a página `register-supervisor.html`
    // e sua respectiva função de Cloud Function para maior segurança.
    if (signupForm) {
        // Redireciona para a nova página de registro de supervisor
        window.location.href = 'register-supervisor.html';
    }

    // --- LÓGICA DE LOGIN ---
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = loginForm['email'].value;
            const password = loginForm['password'].value;

            // Faz o login do usuário com o Firebase Auth
            signInWithEmailAndPassword(auth, email, password)
                .then((userCredential) => {
                    // Login bem-sucedido, redireciona para a página principal
                    console.log('Usuário logado com sucesso:', userCredential.user);
                    window.location.href = 'index.html';
                })
                .catch((error) => {
                    // Trata os erros mais comuns
                    let friendlyMessage = 'Ocorreu um erro ao fazer login.';
                    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                        friendlyMessage = 'E-mail ou senha incorretos.';
                    }
                    console.error("Erro no login:", error);
                    showAuthError(friendlyMessage);
                });
        });
    }
});