// Importa as funções necessárias do Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Sua configuração do Firebase que você pegou no console
const firebaseConfig = {
    apiKey: "AIzaSyCkOK3QP17BwIWaaS-YTbwCxvg5IYFrIzA",
    authDomain: "automacao-maismedicos.firebaseapp.com",
    projectId: "automacao-maismedicos",
    storageBucket: "automacao-maismedicos.appspot.com",
    messagingSenderId: "456702645135",
    appId: "1:456702645135:web:1e672bfec24764a33571fa",
    measurementId: "G-SMRT9S5KQ4"
  };

// Inicializa o Firebase
export const app = initializeApp(firebaseConfig);

// Exporta a instância do Firestore para que possamos usá-la em outros arquivos
export const db = getFirestore(app);