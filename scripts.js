document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('cadastro-form');
    const doctorSelector = document.getElementById('doctor-selector');
    const medicoCpfInput = document.getElementById('medico-cpf');

    // Função para carregar os nomes dos médicos no seletor
    function loadDoctorSelector() {
        const data = JSON.parse(localStorage.getItem('maismedicos_data')) || {};
        const doctors = Object.keys(data);

        doctorSelector.innerHTML = '<option value="">-- Selecione um médico para carregar os dados --</option>';

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
            form.reset(); // Limpa o formulário se nenhuma opção for selecionada
        }
    });

    // Carregar o seletor de médicos ao iniciar a página
    loadDoctorSelector();
});