// Dans popup.js

// Définir le mot de passe (vous pouvez le changer)
const CORRECT_PASSWORD = "monmotdepasse"; // <-- REMPLACEZ CECI PAR VOTRE MOT DE PASSE SOUHAITÉ

// Récupérer les éléments du DOM une seule fois (quand le DOM est chargé)
let passwordModal;
let passwordInput;
let passwordError;
let submitPasswordButton;
let closeButton;

document.addEventListener('DOMContentLoaded', () => {
    passwordModal = document.getElementById('passwordModal');
    passwordInput = document.getElementById('passwordInput');
    passwordError = document.getElementById('passwordError');
    submitPasswordButton = document.getElementById('submitPassword');
    closeButton = passwordModal.querySelector('.close-button');

    // Attacher les écouteurs d'événements internes au popup ici
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            passwordModal.style.display = 'none';
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === passwordModal) {
            passwordModal.style.display = 'none';
        }
    });

    if (submitPasswordButton) {
        submitPasswordButton.addEventListener('click', checkPassword);
    }

    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                checkPassword();
            }
        });
    }
});

// Fonction pour ouvrir le popup (rendue globale)
function openPasswordModal() {
    if (passwordModal) {
        passwordModal.style.display = 'flex';
        passwordInput.value = '';
        passwordError.textContent = '';
        passwordInput.focus();
    }
}

// Fonction pour vérifier le mot de passe (rendue globale)
function checkPassword() {
    if (passwordInput.value === CORRECT_PASSWORD) {
        window.location.href = 'https://mikefri.github.io/Teslatv/xxx.html'; // Redirige
    } else {
        passwordError.textContent = 'Mot de passe incorrect. Veuillez réessayer.';
        passwordInput.value = '';
        passwordInput.focus();
    }
}