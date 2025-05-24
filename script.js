const video = document.getElementById('video');
const channelSelect = document.getElementById('channelSelect');
const statusMessage = document.getElementById('statusMessage');
const channelLogo = document.getElementById('channelLogo'); // Récupérer l'élément img du logo
let hls;
let channels = [];

// Fonction pour charger et lire une chaîne
function loadChannel(url, logoUrl, channelName) { // Ajout des paramètres logoUrl et channelName
    statusMessage.textContent = `Chargement de ${channelName || 'la chaîne'}...`;

    // Mettre à jour l'image du logo
    if (logoUrl) {
        channelLogo.src = logoUrl;
        channelLogo.alt = `Logo de ${channelName || 'la chaîne'}`;
        channelLogo.style.display = 'block'; // Afficher le logo
    } else {
        channelLogo.src = ''; // Vider la source si pas de logo
        channelLogo.alt = '';
        channelLogo.style.display = 'none'; // Cacher le logo si non disponible
    }

    if (hls) {
        hls.destroy();
        hls = null;
    }

    if (Hls.isSupported()) {
        hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, function() {
            video.play();
            statusMessage.textContent = `Lecture de ${channelName || 'la chaîne sélectionnée'}.`;
        });
        hls.on(Hls.Events.ERROR, function (event, data) {
            console.error('Erreur HLS:', data);
            let errorMessage = `Erreur de lecture : ${data.details}.`;
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                errorMessage = "Erreur réseau : Impossible de charger le flux. Vérifiez le lien ou votre connexion.";
                if (data.response && data.response.code === 404) {
                    errorMessage += " (404 Not Found - Le flux n'existe plus ou l'URL est incorrecte).";
                } else if (data.response && data.response.code >= 400 && data.response.code < 500) {
                    errorMessage += " (Accès refusé ou flux expiré).";
                }
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                errorMessage = "Erreur média : Problème de décodage ou de format du flux.";
            }
            statusMessage.textContent = errorMessage;

            if (data.fatal) {
                console.error("Erreur fatale détectée, tentative de récupération...");
                if (hls) hls.destroy();
                hls = null;
            }
        });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
        video.addEventListener('loadedmetadata', function() {
            video.play();
            statusMessage.textContent = `Lecture de ${channelName || 'la chaîne sélectionnée'}.`;
        });
        video.addEventListener('error', function() {
            statusMessage.textContent = "Erreur de lecture native. Le flux n'est peut-être pas supporté.";
        });
    } else {
        statusMessage.textContent = "Votre navigateur ne supporte pas la lecture de flux HLS.";
        const playerDiv = document.getElementById('videoPlayer');
        playerDiv.innerHTML = '<p class="message" style="color: #ff4d4d;">Votre navigateur ne supporte pas la lecture de flux HLS.</p>';
        channelLogo.style.display = 'none'; // Cacher le logo si pas de support
    }
}

// Remplir le menu déroulant avec les chaînes
function populateChannels() {
    channelSelect.innerHTML = '';
    channels.forEach((channel, index) => {
        const option = document.createElement('option');
        option.value = channel.url;
        option.textContent = channel.name;
        // On stocke l'URL du logo dans un attribut de données pour un accès facile
        option.dataset.logo = channel.logo || ''; // Utilisez || '' pour gérer les logos manquants
        channelSelect.appendChild(option);
    });
}

// Charger la chaîne sélectionnée quand l'utilisateur change de sélection
channelSelect.addEventListener('change', (event) => {
    const selectedOption = event.target.options[event.target.selectedIndex];
    const selectedUrl = selectedOption.value;
    const selectedLogo = selectedOption.dataset.logo;
    const selectedName = selectedOption.textContent;
    loadChannel(selectedUrl, selectedLogo, selectedName);
});

// --- Chargement des chaînes depuis le fichier JSON ---
fetch('channels.json')
    .then(response => {
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        channels = data;
        populateChannels();
        if (channels.length > 0) {
            // Charger la première chaîne au démarrage, y compris son logo et nom
            loadChannel(channels[0].url, channels[0].logo, channels[0].name);
        } else {
            statusMessage.textContent = "Aucune chaîne trouvée dans channels.json.";
            channelLogo.style.display = 'none'; // Cacher le logo si pas de chaînes
        }
    })
    .catch(error => {
        console.error("Erreur lors du chargement des chaînes:", error);
        statusMessage.textContent = `Erreur: Impossible de charger les chaînes. Vérifiez 'channels.json'. (${error.message})`;
        channelLogo.style.display = 'none'; // Cacher le logo en cas d'erreur de chargement
    });