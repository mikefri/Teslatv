document.addEventListener('DOMContentLoaded', () => {
    const accessXxButton = document.getElementById('accessXxButton');
    const passwordModal = document.getElementById('passwordModal');
    const closeButton = passwordModal.querySelector('.close-button');
    const passwordInput = document.getElementById('passwordInput');
    const submitPasswordButton = document.getElementById('submitPassword');
    const passwordError = document.getElementById('passwordError');

    // Définir le mot de passe (vous pouvez le changer)
    const CORRECT_PASSWORD = "monmotdepasse"; // <-- REMPLACEZ CECI PAR VOTRE MOT DE PASSE SOUHAITÉ

    // Fonction pour ouvrir le popup
    if (accessXxButton) {
        accessXxButton.addEventListener('click', (e) => {
            e.preventDefault(); // Empêche le lien de naviguer directement
            passwordModal.style.display = 'flex'; // Affiche le popup
            passwordInput.value = ''; // Réinitialise le champ de mot de passe
            passwordError.textContent = ''; // Efface les messages d'erreur précédents
            passwordInput.focus(); // Met le focus sur le champ de mot de passe
        });
    }

    // Fonction pour fermer le popup
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            passwordModal.style.display = 'none'; // Cache le popup
        });
    }

    // Fermer le popup si l'utilisateur clique en dehors du contenu
    window.addEventListener('click', (e) => {
        if (e.target === passwordModal) {
            passwordModal.style.display = 'none';
        }
    });

    // Fonction pour vérifier le mot de passe
    if (submitPasswordButton) {
        submitPasswordButton.addEventListener('click', () => {
            if (passwordInput.value === CORRECT_PASSWORD) {
                window.location.href = 'https://mikefri.github.io/Teslatv/xxx.html'; // Redirige vers la page si le mot de passe est correct
            } else {
                passwordError.textContent = 'Mot de passe incorrect. Veuillez réessayer.';
                passwordInput.value = ''; // Réinitialise le champ
                passwordInput.focus(); // Remet le focus
            }
        });
    }

    // Permettre l'accès avec la touche Entrée
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                submitPasswordButton.click(); // Simule un clic sur le bouton de soumission
            }
        });
    }
});