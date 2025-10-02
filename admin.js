// Importa as funções do Firebase necessárias
import { app } from './firebase-config.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";

document.addEventListener('DOMContentLoaded', function () {
    // Inicializa os serviços do Firebase
    const auth = getAuth(app);
    const functions = getFunctions(app); // Não é necessário especificar a região se for a padrão (us-central1)

    // Elementos da página
    const loadingContainer = document.getElementById('loading-container');
    const errorContainer = document.getElementById('error-container');
    const supervisorsTable = document.getElementById('supervisors-table');
    const supervisorsList = document.getElementById('supervisors-list');

    // --- GATEKEEPER ---
    // Verifica se há um usuário logado antes de carregar o conteúdo
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Se o usuário está logado, busca a lista de supervisores
            console.log("Usuário autenticado. Carregando lista de supervisores...");
            loadSupervisors();
        } else {
            // Se não houver usuário, redireciona para a página de login
            console.log("Nenhum usuário autenticado. Redirecionando para login.html");
            window.location.href = 'login.html';
        }
    });

    async function loadSupervisors() {
        try {
            // Exibe o indicador de carregamento
            loadingContainer.style.display = 'block';
            supervisorsTable.style.display = 'none';
            errorContainer.style.display = 'none';

            // Prepara a chamada para a Cloud Function 'listSupervisors'
            const listSupervisors = httpsCallable(functions, 'listSupervisors');
            const result = await listSupervisors();

            const { supervisors } = result.data;

            // Limpa a tabela antes de adicionar os novos dados
            supervisorsList.innerHTML = '';

            if (supervisors && supervisors.length > 0) {
                supervisors.forEach(supervisor => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${supervisor.email}</td>
                        <td>${supervisor.uid}</td>
                    `;
                    supervisorsList.appendChild(row);
                });
            } else {
                const row = document.createElement('tr');
                row.innerHTML = `<td colspan="2">Nenhum supervisor encontrado.</td>`;
                supervisorsList.appendChild(row);
            }

            // Esconde o carregamento e exibe a tabela
            loadingContainer.style.display = 'none';
            supervisorsTable.style.display = 'table';

        } catch (error) {
            console.error("Erro detalhado ao carregar supervisores:", error);
            // Exibe uma mensagem de erro na UI
            loadingContainer.style.display = 'none';
            errorContainer.style.display = 'block';
            errorContainer.querySelector('p').textContent = `Erro ao carregar: ${error.message}`;
        }
    }
});