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
        onSnapshot(doctorsCollection, (snapshot) => {
            // Limpa as listas antes de popular
            doctorSelector.innerHTML = '<option value="">-- Selecione um médico da sua lista --</option>';
            doctorList.innerHTML = '';

            if (snapshot.empty) {
                doctorList.innerHTML = '<li>Nenhum médico cadastrado.</li>';
                return;
            }

            snapshot.forEach(doc => {
                const doctor = doc.data();
                const cpf = doc.id; // O ID do documento no Firestore é o nosso CPF

                // Popula o seletor da página principal
                const option = new Option(`${doctor['medico-nome']} (${cpf})`, cpf);
                doctorSelector.appendChild(option);

                // Popula a lista no modal
                const li = document.createElement('li');
                li.textContent = `${doctor['medico-nome']} (${cpf})`;
                li.dataset.cpf = cpf;

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Excluir';
                deleteBtn.className = 'delete-doctor-btn';
                deleteBtn.dataset.cpf = cpf;
                li.appendChild(deleteBtn);

                doctorList.appendChild(li);
            });
        });
    }


    // Abre o modal
    function openModal() {
        modal.classList.remove('hidden');
    }

    // Fecha o modal
    function closeModal() {
        modal.classList.add('hidden');
        doctorForm.reset();
        doctorIdInput.value = '';
    }

    // Salva ou atualiza um médico no Firestore
    doctorForm.addEventListener('submit', async function(event) {
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

        try {
            // Cria um documento no Firestore usando o CPF como ID único.
            await setDoc(doc(db, 'doctors', cpf), doctorData);

            // Redireciona para a página de confirmação com o nome do médico
            const doctorName = encodeURIComponent(doctorData['medico-nome']);
            window.location.href = `confirmation.html?doctorName=${doctorName}`;

        } catch (error) {
            console.error("Erro ao salvar médico no Firestore: ", error);
            alert("Ocorreu um erro ao salvar o médico. Verifique o console para mais detalhes.");
        }
    });

    // O event listener para o botão 'successOkBtn' foi removido, pois o modal não existe mais.

    // Lógica para clicar na lista de médicos (para editar ou excluir)
    doctorList.addEventListener('click', async function(event) {
        const target = event.target;
        const cpf = target.dataset.cpf;

        if (!cpf) return;

        if (target.tagName === 'LI') {
            // Clicou para editar: busca os dados do médico no Firestore
            try {
                const docRef = doc(db, 'doctors', cpf);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const doctorData = docSnap.data();
                    // Preenche o formulário para edição
                    for (const key in doctorData) {
                        if (doctorForm.elements[key]) {
                            doctorForm.elements[key].value = doctorData[key];
                        }
                    }
                    // Garante que o CPF esteja no campo para o submit saber que é uma edição
                    doctorForm.elements['medico-cpf'].value = cpf;
                } else {
                    console.log("Nenhum documento encontrado para edição!");
                }
            } catch (error) {
                console.error("Erro ao buscar médico para edição: ", error);
            }

        } else if (target.classList.contains('delete-doctor-btn')) {
            // Clicou para excluir
            if (confirm(`Tem certeza que deseja excluir o médico com CPF ${cpf}? Esta ação é irreversível.`)) {
                try {
                    await deleteDoc(doc(db, 'doctors', cpf));
                    alert('Médico excluído com sucesso do Firebase!');
                    doctorForm.reset(); // Limpa o formulário caso o médico excluído estivesse sendo editado
                } catch (error) {
                    console.error("Erro ao excluir médico: ", error);
                    alert("Ocorreu um erro ao excluir o médico.");
                }
            }
        }
    });


    clearDoctorFormBtn.addEventListener('click', () => {
        doctorForm.reset();
        doctorIdInput.value = '';
    });


    // --- Lógica do Formulário de Relatório Principal ---

    // Mostra/esconde o formulário de relatório ao selecionar um médico
    doctorSelector.addEventListener('change', function() {
        if (this.value) {
            reportForm.classList.remove('hidden');
            reportHeader.textContent = this.options[this.selectedIndex].text;
        } else {
            reportForm.classList.add('hidden');
            reportHeader.textContent = '';
        }
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
});