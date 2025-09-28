// Importa o 'db' (instância do Firestore) do nosso arquivo de configuração.
// Isso nos permite interagir com o banco de dados do Firebase.
import { db } from './firebase-config.js';
// Importa as funções do Firestore que usaremos para manipular os dados.
import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function() {
    // --- Elementos Globais ---
    const doctorSelector = document.getElementById('doctor-selector');
    const manageDoctorsBtn = document.getElementById('manage-doctors-btn');
    const reportForm = document.getElementById('report-form');
    const reportHeader = document.getElementById('report-header').querySelector('span');
    const mainDoctorActions = document.getElementById('main-doctor-actions');
    const editSelectedDoctorBtn = document.getElementById('edit-selected-doctor-btn');
    const deleteSelectedDoctorBtn = document.getElementById('delete-selected-doctor-btn');


    // --- Elementos do Modal ---
    const modal = document.getElementById('doctor-modal');
    const closeBtn = document.querySelector('.close-btn');
    const doctorList = document.getElementById('doctor-list');
    const doctorForm = document.getElementById('doctor-form');
    const doctorIdInput = document.getElementById('doctor-id'); // Mantido para lógica de edição
    const clearDoctorFormBtn = document.getElementById('clear-doctor-form-btn');

    // O modal de sucesso foi removido e substituído por uma página de confirmação.

    // Referência para a coleção 'doctors' no Firestore.
    // Pense nisso como o "endereço" da nossa lista de médicos no banco de dados.
    const doctorsCollection = collection(db, 'doctors');

    // --- Funções de Gerenciamento de Médicos (Agora com Firebase) ---

    // Carrega médicos do Firestore e popula as listas
    // A função onSnapshot "ouve" em tempo real. Qualquer mudança no banco de dados
    // reflete na interface imediatamente.
    function listenForDoctors() {
        console.log("Setting up listener for doctors collection...");
        onSnapshot(doctorsCollection, (snapshot) => {
            console.log("Listener fired! Received snapshot.");
            // Limpa as listas antes de popular
            doctorSelector.innerHTML = '<option value="">-- Selecione um médico da sua lista --</option>';
            doctorList.innerHTML = '';

            if (snapshot.empty) {
                console.log("Snapshot is empty. No doctors found.");
                doctorList.innerHTML = '<li>Nenhum médico cadastrado.</li>';
                return;
            }

            console.log(`Found ${snapshot.size} doctor(s). Populating lists...`);
            snapshot.forEach(doc => {
                const doctor = doc.data();
                const cpf = doc.id; // O ID do documento no Firestore é o nosso CPF
                console.log(`  - Processing doctor: ${doctor['medico-nome']} (CPF: ${cpf})`);

                // Popula o seletor da página principal
                const option = new Option(`${doctor['medico-nome']} (${cpf})`, cpf);
                doctorSelector.appendChild(option);

                // Popula a lista no modal
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
            console.error("Error in onSnapshot listener: ", error);
            alert("Erro ao monitorar o banco de dados. Verifique as permissões do Firestore.");
        });
    }


    // Abre o modal
    function openModal() {
        modal.classList.remove('hidden');
    }

    // Função centralizada para resetar o formulário de médico
    function resetDoctorForm() {
        doctorForm.reset();
        const cpfInput = doctorForm.elements['medico-cpf'];
        cpfInput.readOnly = false;
        cpfInput.classList.remove('readonly');
        doctorIdInput.value = ''; // Limpa o campo hidden
    }

    // Fecha o modal
    function closeModal() {
        modal.classList.add('hidden');
        resetDoctorForm();
    }

    // Salva ou atualiza um médico no Firestore
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

        console.log(`Attempting to save doctor with CPF: ${cpf}`);
        console.log("Data to be saved:", doctorData);

        // Usando .then() e .catch() para um feedback mais claro
        setDoc(doc(db, 'doctors', cpf), doctorData)
            .then(() => {
                console.log("Doctor data successfully saved to Firestore!");

                // Prepara o formulário para a próxima entrada antes de sair da página.
                resetDoctorForm();

                // Redireciona para a página de confirmação com o nome do médico
                const doctorName = encodeURIComponent(doctorData['medico-nome']);
                console.log(`Redirecting to confirmation.html for doctor: ${doctorName}`);
                window.location.href = `confirmation.html?doctorName=${doctorName}`;
            })
            .catch((error) => {
                console.error("Firestore Error - Failed to save doctor: ", error);
                alert("Ocorreu um erro grave ao salvar o médico. Verifique as permissões do banco de dados (Firestore Rules) e a conexão com a internet. Detalhes no console.");
            });
    });

    // O event listener para o botão 'successOkBtn' foi removido, pois o modal não existe mais.

    // --- Funções Reutilizáveis de Ação ---

    // Preenche o formulário para edição e abre o modal
    async function fillDoctorFormForEdit(cpf) {
        if (!cpf) return;
        console.log(`Editing doctor with CPF: ${cpf}`);
        try {
            const docRef = doc(db, 'doctors', cpf);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const doctorData = docSnap.data();
                // Preenche o formulário com os dados do médico
                for (const key in doctorData) {
                    if (doctorForm.elements[key]) {
                        doctorForm.elements[key].value = doctorData[key];
                    }
                }
                // Trava o campo CPF para evitar a criação de um novo registro
                const cpfInput = doctorForm.elements['medico-cpf'];
                cpfInput.value = cpf; // Garante que o CPF correto está no campo
                cpfInput.readOnly = true;
                cpfInput.classList.add('readonly'); // Adiciona classe para feedback visual

                openModal(); // Abre a janela do formulário

            } else {
                console.log("Nenhum médico encontrado para edição com este CPF!");
                alert("Médico não encontrado no banco de dados.");
            }
        } catch (error) {
            console.error("Erro ao buscar médico para edição: ", error);
            alert("Erro ao carregar dados do médico para edição.");
        }
    }

    // Exclui um médico do banco de dados
    async function deleteDoctor(cpf) {
        if (!cpf) return;
        console.log(`Attempting to delete doctor with CPF: ${cpf}`);
        if (confirm(`Tem certeza que deseja excluir o médico com CPF ${cpf}? Esta ação é irreversível.`)) {
            try {
                await deleteDoc(doc(db, 'doctors', cpf));
                alert('Médico excluído com sucesso!');
                resetDoctorForm(); // Reseta o formulário, caso o médico excluído estivesse em edição.

                // Se o médico excluído era o que estava selecionado no dropdown principal, limpa a seleção.
                if (doctorSelector.value === cpf) {
                    doctorSelector.value = '';
                    // Dispara o evento 'change' manualmente para atualizar a UI (esconder formulário e botões)
                    doctorSelector.dispatchEvent(new Event('change'));
                }

            } catch (error) {
                console.error("Erro ao excluir médico: ", error);
                alert("Ocorreu um erro ao excluir o médico.");
            }
        }
    }


    // --- Event Listeners ---

    // Lógica para clicar nos botões de Editar/Excluir na lista do modal
    doctorList.addEventListener('click', function(event) {
        const target = event.target;
        const cpf = target.dataset.cpf;

        if (target.classList.contains('edit-doctor-btn')) {
            fillDoctorFormForEdit(cpf);
        } else if (target.classList.contains('delete-doctor-btn')) {
            deleteDoctor(cpf);
        }
    });

    // Limpa o formulário e reabilita o campo CPF
    clearDoctorFormBtn.addEventListener('click', resetDoctorForm);


    // --- Lógica do Formulário de Relatório Principal ---

    // Mostra/esconde o formulário de relatório e os botões de ação ao selecionar um médico
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

    // Botão "Editar" da página principal
    editSelectedDoctorBtn.addEventListener('click', () => {
        const selectedCpf = doctorSelector.value;
        fillDoctorFormForEdit(selectedCpf);
    });

    // Botão "Excluir" da página principal
    deleteSelectedDoctorBtn.addEventListener('click', () => {
        const selectedCpf = doctorSelector.value;
        deleteDoctor(selectedCpf);
    });

    // Envia o relatório para o Firestore ao submeter o formulário
    reportForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const selectedCpf = doctorSelector.value;
        if (!selectedCpf) {
            alert('Por favor, selecione um médico para gerar o relatório.');
            return;
        }

        try {
            // 1. Pega os dados de identificação do médico do Firestore
            const docRef = doc(db, 'doctors', selectedCpf);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                alert("Erro: Médico selecionado não encontrado no banco de dados.");
                return;
            }
            const doctorIdentificationData = docSnap.data();

            // 2. Pega os dados do relatório mensal do formulário
            const reportFormData = new FormData(reportForm);
            const monthlyReportData = {};
            reportFormData.forEach((value, key) => {
                monthlyReportData[key] = value;
            });

            // 3. Combina os dois conjuntos de dados
            const finalReportData = {
                ...doctorIdentificationData,
                ...monthlyReportData,
                reportStatus: 'pending', // Status inicial para o robô
                createdAt: new Date().toISOString() // Data de criação para controle
            };

            // 4. Salva o relatório completo em uma nova coleção 'reports'
            // Usamos o CPF + Timestamp para criar um ID único para o relatório
            const reportId = `report_${selectedCpf}_${Date.now()}`;
            await setDoc(doc(db, 'reports', reportId), finalReportData);

            alert('Relatório enviado para automação com sucesso!');
            reportForm.reset();
            reportForm.classList.add('hidden');
            doctorSelector.value = '';

        } catch (error) {
            console.error("Erro ao enviar relatório para o Firestore: ", error);
            alert("Ocorreu um erro ao enviar o relatório. Verifique o console para mais detalhes.");
        }
    });

    // --- Lógica Condicional (sem alterações) ---
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

        radios.forEach(radio => {
            radio.addEventListener('change', setVisibility);
        });

        // Set initial state on page load
        setVisibility();
    }


    // --- Inicialização ---
    listenForDoctors(); // <-- SUBSTITUÍMOS loadDoctors() por listenForDoctors()
    manageDoctorsBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', function(event) {
        if (event.target == modal) {
            closeModal();
        }
    });

    // Configura a lógica condicional para todos os campos relevantes
    handleConditionalDisplay('grupos-prioritarios', 'grupo-prioritario-outro-detalhes', 'Outros');
    handleConditionalDisplay('medico-ausente', 'detalhes-ausencia', 'Sim');
    handleConditionalDisplay('caso-excepcional', 'detalhes-caso-excepcional', 'Sim');
    handleConditionalDisplay('dificuldade-conduta', 'detalhes-dificuldade', 'Sim');
    handleConditionalDisplay('informar-tutor', 'detalhes-ocorrencia', 'Sim');

    // Força a seleção do rádio "Outros" e a exibição do campo de texto ao carregar
    const outrosRadio = document.querySelector('input[name="grupos-prioritarios"][value="Outros"]');
    if (outrosRadio) {
        outrosRadio.checked = true;
        outrosRadio.dispatchEvent(new Event('change'));
    }
});