const video = document.getElementById('video');
const channelSelect = document.getElementById('channelSelect');
const statusMessage = document.getElementById('statusMessage');
let hls;
let channels = []; // Déclarez channels vide pour le moment

// Fonction pour charger et lire une chaîne
function loadChannel(url) {
    statusMessage.textContent = "Chargement en cours...";
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
            statusMessage.textContent = `Lecture de ${channels.find(c => c.url === url)?.name || 'la chaîne sélectionnée'}.`;
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
            statusMessage.textContent = `Lecture de ${channels.find(c => c.url === url)?.name || 'la chaîne sélectionnée'}.`;
        });
        video.addEventListener('error', function() {
            statusMessage.textContent = "Erreur de lecture native. Le flux n'est peut-être pas supporté.";
        });
    } else {
        statusMessage.textContent = "Votre navigateur ne supporte pas la lecture de flux HLS.";
        const playerDiv = document.getElementById('videoPlayer');
        playerDiv.innerHTML = '<p class="message" style="color: #ff4d4d;">Votre navigateur ne supporte pas la lecture de flux HLS.</p>';
    }
}

// Remplir le menu déroulant avec les chaînes
function populateChannels() {
    // S'assurer que le sélecteur est vide avant d'ajouter de nouvelles options
    channelSelect.innerHTML = '';
    channels.forEach((channel, index) => {
        const option = document.createElement('option');
        option.value = channel.url;
        option.textContent = channel.name;
        channelSelect.appendChild(option);
    });
}

// Charger la chaîne sélectionnée quand l'utilisateur change de sélection
channelSelect.addEventListener('change', (event) => {
    loadChannel(event.target.value);
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
        channels = data; // Assigne les données JSON chargées à la variable 'channels'
        populateChannels(); // Remplir le menu déroulant
        if (channels.length > 0) {
            loadChannel(channels[0].url); // Charger la première chaîne au démarrage
        } else {
            statusMessage.textContent = "Aucune chaîne trouvée dans channels.json.";
        }
    })
    .catch(error => {
        console.error("Erreur lors du chargement des chaînes:", error);
        statusMessage.textContent = `Erreur: Impossible de charger les chaînes. Vérifiez 'channels.json'. (${error.message})`;
    });

// Le `populateChannels()` initial et `loadChannel()` sont déplacés dans le `.then()` du `Workspace`