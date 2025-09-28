document.addEventListener('DOMContentLoaded', () => {
    const doctorNameElement = document.getElementById('doctor-name');

    // Pega os parâmetros da URL
    const urlParams = new URLSearchParams(window.location.search);
    const doctorName = urlParams.get('doctorName');

    if (doctorName) {
        // Decodifica o nome para exibir corretamente (espaços, acentos, etc.)
        doctorNameElement.textContent = decodeURIComponent(doctorName);
    } else {
        doctorNameElement.textContent = "'Nome não informado'";
    }
});