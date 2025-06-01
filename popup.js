// Dans popup.js

// Déclarer les variables globalement (ou du moins en dehors de DOMContentLoaded pour être accessibles)
let passwordModal;
let passwordInput;
let passwordError;
let submitPasswordButton;
let closeButton;

// Définir le mot de passe (vous pouvez le changer)
const CORRECT_PASSWORD = "Tesla"; // <-- REMPLACEZ CECI PAR VOTRE MOT DE PASSE SOUHAITÉ

// Fonction d'initialisation du popup qui sera appelée une fois le DOM chargé
function initializePopupElements() {
    passwordModal = document.getElementById('passwordModal');
    if (!passwordModal) { // Ajout d'une vérification robuste
        console.error("L'élément #passwordModal n'a pas été trouvé. Le popup ne fonctionnera pas.");
        return;
    }
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

    // Fermer le popup si l'utilisateur clique en dehors du contenu
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
}

// Appeler l'initialisation quand le DOM est prêt pour popup.js
document.addEventListener('DOMContentLoaded', initializePopupElements);


// Fonction pour ouvrir le popup (rendue globale)
// Cette fonction peut être appelée par vod.js
function openPasswordModal() {
    if (passwordModal) { // S'assurer que passwordModal a été trouvé et initialisé
        passwordModal.style.display = 'flex'; // Affiche le popup
        passwordInput.value = ''; // Réinitialise le champ de mot de passe
        passwordError.textContent = ''; // Efface les messages d'erreur précédents
        passwordInput.focus(); // Met le focus sur le champ de mot de passe
    } else {
        console.warn("openPasswordModal() appelé avant que le popup soit prêt.");
    }
}

// Fonction pour vérifier le mot de passe (rendue globale)
// Peut être appelée directement par les écouteurs d'événements internes ou par d'autres scripts si besoin
function checkPassword() {
    if (passwordInput && passwordInput.value === CORRECT_PASSWORD) {
        window.location.href = 'https://mikefri.github.io/Teslatv/xxx.html'; // Redirige
    } else if (passwordError) {
        passwordError.textContent = 'Mot de passe incorrect. Veuillez réessayer.';
        passwordInput.value = '';
        passwordInput.focus();
    }
}