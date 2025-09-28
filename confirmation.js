document.addEventListener('DOMContentLoaded', () => {
    // Pega os parâmetros da URL.
    const urlParams = new URLSearchParams(window.location.search);
    // Busca o nome do médico, que foi passado como um parâmetro 'doctorName'.
    const doctorName = urlParams.get('doctorName');

    // Se um nome de médico foi passado na URL, personalizamos a mensagem.
    if (doctorName) {
        // Encontra o elemento do título da confirmação pelo seu ID.
        const confirmationTitle = document.getElementById('confirmation-title');
        // Decodifica o nome do médico (para tratar espaços como %20) e atualiza o texto.
        confirmationTitle.textContent = `Médico ${decodeURIComponent(doctorName)} cadastrado com sucesso!`;
    }

    // A lógica do botão "Voltar" já está sendo tratada pelo link <a> no HTML,
    // então não precisamos de código adicional para isso aqui.
});