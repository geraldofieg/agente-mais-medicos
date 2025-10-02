// Importa as funções do Firestore e do Auth
import { db, app } from './firebase-config.js';
import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const auth = getAuth(app);

// --- INICIALIZAÇÃO DA APLICAÇÃO ---
// Esta função verifica se um usuário está logado e, em caso afirmativo,
// inicia a lógica principal da aplicação. A proteção de página (redirecionamento)
// é feita pelo 'auth-guard.js'
onAuthStateChanged(auth, (user) => {
    const loader = document.getElementById('loader');
    const mainContainer = document.querySelector('.container.hidden');

    if (user) {
        // O usuário está logado.
        console.log("Usuário autenticado:", user.uid);

        // Verifica as custom claims para saber se é admin
        user.getIdTokenResult().then((idTokenResult) => {
            const adminPanelLink = document.getElementById('admin-panel-link');
            // Se a claim 'admin' for verdadeira, exibe o link
            if (!!idTokenResult.claims.admin) {
                console.log("Usuário é um administrador. Exibindo o painel administrativo.");
                if (adminPanelLink) {
                    adminPanelLink.style.display = 'inline';
                }
            } else {
                console.log("Usuário não é um administrador.");
            }
        }).catch((error) => {
            console.error("Erro ao obter claims do token:", error);
        });

        // Mostra o conteúdo principal da página e esconde o loader
        if (loader) loader.style.display = 'none';
        if (mainContainer) mainContainer.classList.remove('hidden');

        // Carrega a lógica principal da aplicação
        initializeAppLogic(user);
    } else {
        // Se não houver usuário, o 'auth-guard.js' já terá redirecionado.
        // Apenas garantimos que o loader seja escondido se por algum motivo ele ainda estiver visível.
        if (loader) loader.style.display = 'none';
        console.log("Nenhum usuário autenticado. O auth-guard deve lidar com o redirecionamento.");
    }
});


// ===================================================================================
// FUNÇÃO PRINCIPAL DA APLICAÇÃO (só roda se o usuário estiver logado)
// ===================================================================================
function initializeAppLogic(currentUser) {

    // --- Elementos Globais ---
    const doctorSelector = document.getElementById('doctor-selector');
    const manageDoctorsBtn = document.getElementById('manage-doctors-btn');
    const reportForm = document.getElementById('report-form');
    const reportHeader = document.getElementById('report-header').querySelector('span');
    const mainDoctorActions = document.getElementById('main-doctor-actions');
    const editSelectedDoctorBtn = document.getElementById('edit-selected-doctor-btn');
    const deleteSelectedDoctorBtn = document.getElementById('delete-selected-doctor-btn');

    // Adiciona o botão de Logout (precisamos criar este botão no HTML)
    const logoutBtn = document.getElementById('logout-btn');
    if(logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut(auth).then(() => {
                console.log("Logout bem-sucedido.");
                window.location.href = 'login.html';
            }).catch((error) => {
                console.error("Erro no logout:", error);
            });
        });
    }


    // --- Elementos do Modal ---
    const modal = document.getElementById('doctor-modal');
    const closeBtn = document.querySelector('.close-btn');
    const doctorList = document.getElementById('doctor-list');
    const doctorForm = document.getElementById('doctor-form');
    const clearDoctorFormBtn = document.getElementById('clear-doctor-form-btn');

    // --- Elementos do Modal de Importação ---
    const importDoctorsBtn = document.getElementById('import-doctors-btn');
    const importModal = document.getElementById('import-credentials-modal');
    const importModalCloseBtn = document.querySelector('.import-modal-close-x');
    const cancelImportBtn = document.getElementById('cancel-import-btn');
    const importCredentialsForm = document.getElementById('import-credentials-form');
    const importFeedbackDiv = document.getElementById('import-feedback');

    // --- Lógica do Modal de Importação ---
    function openImportModal() {
        importFeedbackDiv.classList.add('hidden');
        importCredentialsForm.reset();
        importModal.classList.remove('hidden');
    }

    function closeImportModal() {
        importModal.classList.add('hidden');
    }

    importDoctorsBtn.addEventListener('click', openImportModal);
    importModalCloseBtn.addEventListener('click', closeImportModal);
    cancelImportBtn.addEventListener('click', closeImportModal);
    window.addEventListener('click', (event) => { if (event.target == importModal) closeImportModal(); });

    importCredentialsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('portal-email').value;
        const password = document.getElementById('portal-password').value;

        const submitButton = importCredentialsForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;

        // Exibe feedback de carregamento
        importFeedbackDiv.classList.remove('hidden');
        importFeedbackDiv.style.backgroundColor = '#eef';
        importFeedbackDiv.style.color = '#333';
        importFeedbackDiv.textContent = 'Importando... Por favor, aguarde. Isso pode levar alguns instantes.';

        try {
            // Importa a função httpsCallable sob demanda
            const { getFunctions, httpsCallable } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js");
            const functions = getFunctions(app);
            const importSupervisedDoctors = httpsCallable(functions, 'importSupervisedDoctors');
            const result = await importSupervisedDoctors({ email, password });

            if (result.data.success) {
                importFeedbackDiv.style.backgroundColor = '#d4edda'; // Verde sucesso
                importFeedbackDiv.style.color = '#155724';
                importFeedbackDiv.textContent = `Sucesso! ${result.data.doctorsAdded} médicos foram importados. A janela será fechada.`;

                // Fecha o modal após um curto período para o usuário ler a mensagem
                setTimeout(closeImportModal, 3000);
            } else {
                // Lança um erro para ser pego pelo bloco catch
                throw new Error(result.data.error || 'Ocorreu um erro desconhecido durante a importação.');
            }
        } catch (error) {
            console.error("Erro ao importar médicos:", error);
            importFeedbackDiv.style.backgroundColor = '#f8d7da'; // Vermelho erro
            importFeedbackDiv.style.color = '#721c24';
            importFeedbackDiv.textContent = `Erro: ${error.message}`;
        } finally {
            // Reabilita o botão ao final da operação
            submitButton.disabled = false;
        }
    });

    // Referência para a coleção 'doctors' no Firestore.
    const doctorsCollection = collection(db, 'doctors');

    // --- Funções de Gerenciamento de Médicos (MODIFICADAS) ---

    // Ouve em tempo real apenas os médicos do supervisor logado
    function listenForDoctors() {
        console.log(`Configurando listener para médicos do supervisor: ${currentUser.uid}`);

        // Cria uma consulta que filtra os médicos pelo 'supervisorId'
        const q = query(doctorsCollection, where("supervisorId", "==", currentUser.uid));

        onSnapshot(q, (snapshot) => {
            console.log("Listener de médicos disparado!");
            doctorSelector.innerHTML = '<option value="">-- Selecione um médico da sua lista --</option>';
            doctorList.innerHTML = '';

            if (snapshot.empty) {
                console.log("Nenhum médico encontrado para este supervisor.");
                doctorList.innerHTML = '<li>Nenhum médico cadastrado.</li>';
                return;
            }

            console.log(`Encontrados ${snapshot.size} médico(s). Populando listas...`);
            snapshot.forEach(doc => {
                const doctor = doc.data();
                const cpf = doc.id;
                console.log(`  - Processando médico: ${doctor['medico-nome']} (CPF: ${cpf})`);

                // Popula o seletor da página principal
                const option = new Option(`${doctor['medico-nome']} (${cpf})`, cpf);
                doctorSelector.appendChild(option);

                // Popula a lista no modal (lógica inalterada)
                const li = document.createElement('li');
                const doctorInfo = document.createElement('span');
                doctorInfo.textContent = `${doctor['medico-nome']} (${cpf})`;
                li.appendChild(doctorInfo);
                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'doctor-actions';
                const editBtn = document.createElement('button');
                editBtn.textContent = 'Editar';
                editBtn.className = 'edit-doctor-btn';
                editBtn.dataset.cpf = cpf;
                actionsDiv.appendChild(editBtn);
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Excluir';
                deleteBtn.className = 'delete-doctor-btn';
                deleteBtn.dataset.cpf = cpf;
                actionsDiv.appendChild(deleteBtn);
                li.appendChild(actionsDiv);
                doctorList.appendChild(li);
            });
        }, (error) => {
            console.error("Erro no listener do Firestore: ", error);
            alert("Erro ao monitorar o banco de dados.");
        });
    }

    // Salva ou atualiza um médico, associando-o ao supervisor (MODIFICADO)
    doctorForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const formData = new FormData(doctorForm);
        const doctorData = {};
        formData.forEach((value, key) => {
            doctorData[key] = value;
        });

        const cpf = doctorData['medico-cpf'].trim();
        if (!cpf || !/^\d{11}$/.test(cpf)) {
            alert('CPF é obrigatório e deve conter 11 dígitos numéricos.');
            return;
        }

        // *** A MUDANÇA CRÍTICA: Associa o médico ao supervisor logado ***
        doctorData.supervisorId = currentUser.uid;

        console.log(`Tentando salvar médico com CPF: ${cpf} para o supervisor ${currentUser.uid}`);
        console.log("Dados a serem salvos:", doctorData);

        setDoc(doc(db, 'doctors', cpf), doctorData)
            .then(() => {
                console.log("Dados do médico salvos com sucesso no Firestore!");
                // Redireciona para a página de confirmação (lógica mantida)
                const doctorName = encodeURIComponent(doctorData['medico-nome']);
                window.location.href = `confirmation.html?doctorName=${doctorName}`;
            })
            .catch((error) => {
                console.error("Erro do Firestore ao salvar médico: ", error);
                alert("Ocorreu um erro grave ao salvar o médico.");
            });
    });

    // Envia o relatório, associando-o ao supervisor (MODIFICADO)
    reportForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const selectedCpf = doctorSelector.value;
        if (!selectedCpf) {
            alert('Por favor, selecione um médico para gerar o relatório.');
            return;
        }

        try {
            const docRef = doc(db, 'doctors', selectedCpf);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists() || docSnap.data().supervisorId !== currentUser.uid) {
                alert("Erro: Médico selecionado não encontrado ou não pertence a você.");
                return;
            }
            const doctorIdentificationData = docSnap.data();

            const reportFormData = new FormData(reportForm);
            const monthlyReportData = {};
            reportFormData.forEach((value, key) => {
                monthlyReportData[key] = value;
            });

            // *** A MUDANÇA CRÍTICA: Associa o relatório ao supervisor logado ***
            const finalReportData = {
                ...doctorIdentificationData,
                ...monthlyReportData,
                supervisorId: currentUser.uid, // Garante que o relatório também tenha a referência
                reportStatus: 'pending',
                createdAt: new Date().toISOString()
            };

            const reportId = `report_${selectedCpf}_${Date.now()}`;
            await setDoc(doc(db, 'reports', reportId), finalReportData);

            alert('Relatório enviado para automação com sucesso!');
            reportForm.reset();
            reportForm.classList.add('hidden');
            doctorSelector.value = '';

        } catch (error) {
            console.error("Erro ao enviar relatório para o Firestore: ", error);
            alert("Ocorreu um erro ao enviar o relatório.");
        }
    });


    // --- Funções e Lógicas Inalteradas ---
    // (As funções abaixo não precisam saber quem é o supervisor, pois operam em dados
    // que já foram carregados de forma segura)

    function openModal() { modal.classList.remove('hidden'); }
    function closeModal() { modal.classList.add('hidden'); resetDoctorForm(); }

    function resetDoctorForm() {
        doctorForm.reset();
        const cpfInput = doctorForm.elements['medico-cpf'];
        cpfInput.readOnly = false;
        cpfInput.classList.remove('readonly');
    }

    async function fillDoctorFormForEdit(cpf) {
        if (!cpf) return;
        try {
            const docRef = doc(db, 'doctors', cpf);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists() && docSnap.data().supervisorId === currentUser.uid) {
                const doctorData = docSnap.data();
                for (const key in doctorData) {
                    if (doctorForm.elements[key]) {
                        doctorForm.elements[key].value = doctorData[key];
                    }
                }
                const cpfInput = doctorForm.elements['medico-cpf'];
                cpfInput.value = cpf;
                cpfInput.readOnly = true;
                cpfInput.classList.add('readonly');
                openModal();
            } else {
                alert("Médico não encontrado ou não pertence a você.");
            }
        } catch (error) {
            console.error("Erro ao buscar médico para edição: ", error);
        }
    }

    async function deleteDoctor(cpf) {
        if (!cpf) return;
        // Primeiro, verificamos se o médico realmente pertence ao supervisor.
        const docRef = doc(db, 'doctors', cpf);
        const docSnap = await getDoc(docRef);
        if(!docSnap.exists() || docSnap.data().supervisorId !== currentUser.uid) {
            alert("Operação não permitida.");
            return;
        }

        if (confirm(`Tem certeza que deseja excluir o médico com CPF ${cpf}?`)) {
            try {
                await deleteDoc(doc(db, 'doctors', cpf));
                alert('Médico excluído com sucesso!');
                resetDoctorForm();
                if (doctorSelector.value === cpf) {
                    doctorSelector.value = '';
                    doctorSelector.dispatchEvent(new Event('change'));
                }
            } catch (error) {
                console.error("Erro ao excluir médico: ", error);
            }
        }
    }

    doctorList.addEventListener('click', function(event) {
        const cpf = event.target.dataset.cpf;
        if (event.target.classList.contains('edit-doctor-btn')) {
            fillDoctorFormForEdit(cpf);
        } else if (event.target.classList.contains('delete-doctor-btn')) {
            deleteDoctor(cpf);
        }
    });

    clearDoctorFormBtn.addEventListener('click', resetDoctorForm);

    doctorSelector.addEventListener('change', function() {
        const selectedCpf = this.value;
        if (selectedCpf) {
            reportForm.classList.remove('hidden');
            mainDoctorActions.classList.remove('hidden');
            reportHeader.textContent = this.options[this.selectedIndex].text;
        } else {
            reportForm.classList.add('hidden');
            mainDoctorActions.classList.add('hidden');
            reportHeader.textContent = '';
        }
    });

    editSelectedDoctorBtn.addEventListener('click', () => fillDoctorFormForEdit(doctorSelector.value));
    deleteSelectedDoctorBtn.addEventListener('click', () => deleteDoctor(doctorSelector.value));

    function handleConditionalDisplay(radioGroupName, conditionalElementId, showOnValue) {
        const radios = document.querySelectorAll(`input[name="${radioGroupName}"]`);
        const conditionalElement = document.getElementById(conditionalElementId);
        function setVisibility() {
            const selectedRadio = document.querySelector(`input[name="${radioGroupName}"]:checked`);
            if (selectedRadio && selectedRadio.value === showOnValue) {
                conditionalElement.classList.remove('hidden');
            } else {
                conditionalElement.classList.add('hidden');
            }
        }
        radios.forEach(radio => radio.addEventListener('change', setVisibility));
        setVisibility();
    }

    // --- Inicialização ---
    listenForDoctors(); // A função agora filtra automaticamente
    manageDoctorsBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => { if (event.target == modal) closeModal(); });

    handleConditionalDisplay('grupos-prioritarios', 'grupo-prioritario-outro-detalhes', 'Outros');
    handleConditionalDisplay('medico-ausente', 'detalhes-ausencia', 'Sim');
    handleConditionalDisplay('caso-excepcional', 'detalhes-caso-excepcional', 'Sim');
    handleConditionalDisplay('dificuldade-conduta', 'detalhes-dificuldade', 'Sim');
    handleConditionalDisplay('informar-tutor', 'detalhes-ocorrencia', 'Sim');
    const outrosRadio = document.querySelector('input[name="grupos-prioritarios"][value="Outros"]');
    if (outrosRadio) {
        outrosRadio.checked = true;
        outrosRadio.dispatchEvent(new Event('change'));
    }
}