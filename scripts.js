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
    const doctorIdInput = document.getElementById('doctor-id');
    const clearDoctorFormBtn = document.getElementById('clear-doctor-form-btn');

    const DOCTORS_STORAGE_KEY = 'maismedicos_doctors_data';

    // --- Funções de Gerenciamento de Médicos (Lógica do Modal) ---

    // Carrega médicos do localStorage e popula as listas
    function loadDoctors() {
        const doctors = JSON.parse(localStorage.getItem(DOCTORS_STORAGE_KEY)) || {};

        // Limpa as listas antes de popular
        doctorSelector.innerHTML = '<option value="">-- Selecione um médico da sua lista --</option>';
        doctorList.innerHTML = '';

        if (Object.keys(doctors).length === 0) {
            doctorList.innerHTML = '<li>Nenhum médico cadastrado.</li>';
        }

        for (const cpf in doctors) {
            const doctor = doctors[cpf];
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
        }
    }

    // Abre o modal
    function openModal() {
        modal.classList.remove('hidden');
    }

    // Fecha o modal
    function closeModal() {
        modal.classList.add('hidden');
        doctorForm.reset();
        doctorIdInput.value = ''; // Limpa o ID para garantir que o próximo save seja de um novo médico
    }

    // Salva ou atualiza um médico
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

        const doctors = JSON.parse(localStorage.getItem(DOCTORS_STORAGE_KEY)) || {};
        doctors[cpf] = doctorData;
        localStorage.setItem(DOCTORS_STORAGE_KEY, JSON.stringify(doctors));

        alert('Médico salvo com sucesso!');
        loadDoctors();
        doctorForm.reset();
        doctorIdInput.value = '';
    });

    // Lógica para clicar na lista de médicos (para editar ou excluir)
    doctorList.addEventListener('click', function(event) {
        const target = event.target;
        const cpf = target.dataset.cpf;

        if (target.tagName === 'LI') {
            // Clicou para editar
            const doctors = JSON.parse(localStorage.getItem(DOCTORS_STORAGE_KEY));
            const doctorData = doctors[cpf];
            if (doctorData) {
                // Preenche o formulário para edição
                for (const key in doctorData) {
                    if (doctorForm.elements[key]) {
                        doctorForm.elements[key].value = doctorData[key];
                    }
                }
                // Garante que o ID oculto (CPF) está preenchido para o submit saber que é uma edição
                doctorForm.elements['medico-cpf'].value = cpf;
            }
        } else if (target.classList.contains('delete-doctor-btn')) {
            // Clicou para excluir
            if (confirm(`Tem certeza que deseja excluir o médico com CPF ${cpf}?`)) {
                const doctors = JSON.parse(localStorage.getItem(DOCTORS_STORAGE_KEY));
                delete doctors[cpf];
                localStorage.setItem(DOCTORS_STORAGE_KEY, JSON.stringify(doctors));
                loadDoctors();
                doctorForm.reset(); // Limpa o formulário caso o médico excluído estivesse sendo editado
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

    // Gera o JSON final ao submeter o formulário de relatório
    reportForm.addEventListener('submit', function(event) {
        event.preventDefault();

        const selectedCpf = doctorSelector.value;
        if (!selectedCpf) {
            alert('Por favor, selecione um médico para gerar o relatório.');
            return;
        }

        // Pega os dados de identificação do médico selecionado
        const doctors = JSON.parse(localStorage.getItem(DOCTORS_STORAGE_KEY));
        const doctorIdentificationData = doctors[selectedCpf];

        // Pega os dados do relatório mensal
        const reportFormData = new FormData(reportForm);
        const monthlyReportData = {};
        reportFormData.forEach((value, key) => {
            monthlyReportData[key] = value;
        });

        // Combina os dois conjuntos de dados
        const finalJsonData = { ...doctorIdentificationData, ...monthlyReportData };

        // Gera e baixa o arquivo JSON
        const jsonString = JSON.stringify(finalJsonData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dados.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        alert('Arquivo "dados.json" gerado com sucesso!');
    });

    // --- Lógica Condicional ---
    function handleConditionalDisplay(radioGroupName, conditionalElementId, showOnValue) {
        const radios = document.querySelectorAll(`input[name="${radioGroupName}"]`);
        const conditionalElement = document.getElementById(conditionalElementId);

        radios.forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.checked && this.value === showOnValue) {
                    conditionalElement.classList.remove('hidden');
                } else {
                    conditionalElement.classList.add('hidden');
                }
            });
            // Estado inicial
            if (radio.checked && radio.value !== showOnValue) {
                 conditionalElement.classList.add('hidden');
            }
        });
    }


    // --- Inicialização ---
    loadDoctors();
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