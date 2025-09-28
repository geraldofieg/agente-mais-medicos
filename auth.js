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

    // --- LÓGICA DE CADASTRO ---
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = signupForm['email'].value;
            const password = signupForm['password'].value;
            const passwordConfirm = signupForm['password-confirm'].value;

            // Validação simples
            if (password !== passwordConfirm) {
                showAuthError('As senhas não coincidem.');
                return;
            }

            // Cria o usuário no Firebase Auth
            createUserWithEmailAndPassword(auth, email, password)
                .then((userCredential) => {
                    // Cadastro bem-sucedido, redireciona para a página principal
                    console.log('Usuário cadastrado com sucesso:', userCredential.user);
                    window.location.href = 'index.html';
                })
                .catch((error) => {
                    // Trata os erros mais comuns
                    let friendlyMessage = 'Ocorreu um erro ao cadastrar.';
                    if (error.code === 'auth/email-already-in-use') {
                        friendlyMessage = 'Este e-mail já está em uso.';
                    } else if (error.code === 'auth/weak-password') {
                        friendlyMessage = 'A senha é muito fraca. Use pelo menos 6 caracteres.';
                    }
                    console.error("Erro no cadastro:", error);
                    showAuthError(friendlyMessage);
                });
        });
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