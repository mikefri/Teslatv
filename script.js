const video = document.getElementById('video');
const channelSelect = document.getElementById('channelSelect');
const statusMessage = document.getElementById('statusMessage');
let hls;

// Définir les chaînes avec leurs informations
const channels = [
    {
        name: "TF1",
        url: "https://raw.githubusercontent.com/Paradise-91/ParaTV/main/streams/tf1plus/tf1.m3u8"
    },
    {
        name: "RMC Decouverte",
        url: "https://d2mt8for1pddy4.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-6uronj7gzvy4j/index.m3u8"
    },
    {
        name: "TFX",
        url: "https://raw.githubusercontent.com/Paradise-91/ParaTV/main/streams/tf1plus/tfx.m3u8"
    }
    // Ajoutez d'autres chaînes ici
];

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
    channels.forEach((channel, index) => {
        const option = document.createElement('option');
        option.value = channel.url;
        option.textContent = channel.name;
        channelSelect.appendChild(option);
    });
    // Sélectionner la première chaîne par défaut
    if (channels.length > 0) {
        channelSelect.value = channels[0].url;
    }
}

// Charger la chaîne sélectionnée quand l'utilisateur change de sélection
channelSelect.addEventListener('change', (event) => {
    loadChannel(event.target.value);
});

// Initialiser la page
populateChannels();
if (channels.length > 0) {
    loadChannel(channels[0].url); // Charger la première chaîne au démarrage
} else {
    statusMessage.textContent = "Aucune chaîne configurée.";
}