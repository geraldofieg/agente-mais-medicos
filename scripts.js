document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('cadastro-form');
    const doctorSelector = document.getElementById('doctor-selector');
    const medicoCpfInput = document.getElementById('medico-cpf');
    const newDoctorBtn = document.getElementById('new-doctor-btn');

    // Função para carregar os nomes dos médicos no seletor
    function loadDoctorSelector() {
        const data = JSON.parse(localStorage.getItem('maismedicos_data')) || {};
        const doctors = Object.keys(data);

        doctorSelector.innerHTML = '<option value="">-- Selecione um médico --</option>';

        if (doctors.length > 0) {
            doctors.forEach(cpf => {
                const doctorName = data[cpf]['medico-nome'];
                const option = document.createElement('option');
                option.value = cpf;
                option.textContent = doctorName ? `${doctorName} (${cpf})` : cpf;
                doctorSelector.appendChild(option);
            });
        }
    }

    // Função para preencher o formulário com os dados de um médico
    function populateForm(cpf) {
        const data = JSON.parse(localStorage.getItem('maismedicos_data')) || {};
        const doctorData = data[cpf];

        if (doctorData) {
            for (const key in doctorData) {
                const input = form.elements[key];
                if (input) {
                    if (input.type === 'radio') {
                        // Para radio buttons, precisamos encontrar o correto no grupo
                        const radioGroup = document.querySelectorAll(`input[name="${key}"]`);
                        radioGroup.forEach(radio => {
                            radio.checked = (radio.value === doctorData[key]);
                            // Disparar o evento de 'change' para atualizar a UI condicional
                            const event = new Event('change');
                            radio.dispatchEvent(event);
                        });
                    } else {
                        input.value = doctorData[key];
                    }
                }
            }
        }
    }

    // Função para limpar o formulário para um novo cadastro
    function clearFormForNewDoctor() {
        form.reset();
        doctorSelector.value = ''; // Reseta o seletor para a opção padrão
        medicoCpfInput.focus(); // Foca no campo CPF para facilitar o novo cadastro
        // Dispara eventos de 'change' nos radios para resetar a UI condicional
        document.querySelectorAll('input[type="radio"]').forEach(radio => radio.dispatchEvent(new Event('change')));
        console.log('Formulário limpo para novo cadastro.');
    }

    // Evento para salvar os dados e exportar o JSON para automação
    form.addEventListener('submit', function(event) {
        event.preventDefault();

        const formData = new FormData(form);
        const data = {};
        formData.forEach((value, key) => {
            data[key] = value;
        });

        const medicoCpf = medicoCpfInput.value.trim();
        if (!medicoCpf || medicoCpf.length !== 11 || !/^\d+$/.test(medicoCpf)) {
            alert('O CPF é obrigatório e deve conter exatamente 11 dígitos numéricos.');
            medicoCpfInput.focus(); // Foca no campo de CPF para facilitar a correção
            return;
        }

        // 1. Salva/Atualiza os dados no localStorage para persistência
        const allData = JSON.parse(localStorage.getItem('maismedicos_data')) || {};
        allData[medicoCpf] = data;
        localStorage.setItem('maismedicos_data', JSON.stringify(allData));
        console.log('Dados do formulário salvos/atualizados localmente.');
        loadDoctorSelector();

        // 2. Gera e baixa o arquivo JSON para o robô
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'dados.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        alert('Dados salvos localmente e o arquivo "dados.json" foi baixado!\n\nPróximo passo: execute o robô de automação.');
    });

    // Evento para carregar os dados ao selecionar um médico
    doctorSelector.addEventListener('change', function() {
        const selectedCpf = this.value;
        if (selectedCpf) {
            populateForm(selectedCpf);
        } else {
            clearFormForNewDoctor(); // Limpa o formulário se a opção padrão for selecionada
        }
    });

    // Evento para limpar o formulário ao clicar em "Cadastrar Novo Médico"
    newDoctorBtn.addEventListener('click', clearFormForNewDoctor);

    // --- Lógica para popular os campos de data e campos condicionais ---

    function populateDateSelectors() {
        const diaSelect = document.getElementById('data-supervisao-dia');
        const mesSelect = document.getElementById('data-supervisao-mes');
        const anoSelect = document.getElementById('data-supervisao-ano');
        const currentYear = new Date().getFullYear();

        // Popular dias (1-31)
        for (let i = 1; i <= 31; i++) {
            diaSelect.add(new Option(i, i));
        }

        // Popular meses
        const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        meses.forEach((mes, index) => {
            mesSelect.add(new Option(mes, index + 1));
        });

        // Popular anos (ano atual + 1 e -1)
        for (let i = currentYear + 1; i >= currentYear - 2; i--) {
            anoSelect.add(new Option(i, i));
        }

        // Pré-selecionar data atual
        const today = new Date();
        diaSelect.value = today.getDate();
        mesSelect.value = today.getMonth() + 1;
        anoSelect.value = today.getFullYear();
    }

    function handleCheckboxConditional(checkboxSelector, conditionalElementId) {
        const checkbox = document.querySelector(checkboxSelector);
        const conditionalElement = document.getElementById(conditionalElementId);

        if (checkbox && conditionalElement) {
            checkbox.addEventListener('change', function() {
                conditionalElement.style.display = this.checked ? 'block' : 'none';
            });
            // Esconde o campo inicialmente se o checkbox não estiver marcado
            conditionalElement.style.display = checkbox.checked ? 'block' : 'none';
        }
    }


    // --- Inicialização ---

    // Carregar o seletor de médicos ao iniciar a página
    loadDoctorSelector();
    // Popular os seletores de data
    populateDateSelectors();
    // Configurar a lógica condicional para o checkbox "Outros"
    handleCheckboxConditional('input[name="grupos-prioritarios"][value="Outros"]', 'grupo-prioritario-outro-detalhes');
});