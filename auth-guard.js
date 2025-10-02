// Importa as funções de autenticação do Firebase
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { app } from './firebase-config.js';

const auth = getAuth(app);

/**
 * Esta função verifica se um usuário está autenticado.
 * Se não houver usuário, redireciona para a página de login.
 * Esta função deve ser chamada em páginas que exigem autenticação.
 */
function protectPage() {
    onAuthStateChanged(auth, (user) => {
        // Se não houver usuário logado, redireciona para a página de login.
        if (!user) {
            console.log("Auth Guard: Usuário não autenticado. Redirecionando para login.html...");
            // Garante que a página de login não tente redirecionar a si mesma.
            if (window.location.pathname.endsWith('login.html') === false) {
                 window.location.href = 'login.html';
            }
        }
        // Se o usuário estiver logado, o script não faz nada e a página é carregada normalmente.
    });
}

// Executa a proteção na inicialização do script.
protectPage();