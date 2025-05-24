const video = document.getElementById('video');
const channelLogo = document.getElementById('channelLogo');
const channelListDiv = document.getElementById('channelList');
const currentTimeDiv = document.getElementById('currentTime'); // Nouveau: référence à l'élément de l'heure

let hls;
let channels = [];

// Fonction pour mettre à jour l'heure affichée
function updateTime() {
    const now = new Date();
    // Options pour le format de l'heure (heure, minute)
    const options = { hour: '2-digit', minute: '2-digit' };
    const timeString = now.toLocaleTimeString('fr-FR', options); // 'fr-FR' pour le format français
    currentTimeDiv.textContent = timeString;
}

// Appeler updateTime toutes les secondes pour maintenir l'heure à jour
setInterval(updateTime, 1000);

// Initialiser l'heure au chargement de la page
updateTime();

// ... (le reste de votre script.js) ...

// Fonction pour charger et lire une chaîne
function loadChannel(url, logoUrl, channelName, channelId) {
    // ... (votre code existant pour loadChannel) ...

    if (hls) {
        hls.destroy();
        hls = null;
    }

    if (Hls.isSupported()) {
        hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, function() {
            hls.subtitleTrack = -1;
            console.log("Subtitles disabled via hls.subtitleTrack = -1");

            if (video.textTracks) {
                for (let i = 0; i < video.textTracks.length; i++) {
                    if (video.textTracks[i].mode !== 'disabled') {
                        video.textTracks[i].mode = 'disabled';
                        console.log(`Piste de sous-titre ${video.textTracks[i].label || i} désactivée.`);
                    }
                }
            }
            
            video.play();
        });
        hls.on(Hls.Events.ERROR, function (event, data) {
            console.error('Erreur HLS:', data);
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
        });
        video.addEventListener('error', function() {
        });
    } else {
        const playerDiv = document.getElementById('videoPlayer');
        console.error("Votre navigateur ne supporte pas la lecture de flux HLS.");
        channelLogo.style.display = 'none';
    }
}

// ... (le reste du script.js) ...

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
            loadChannel(channels[0].url, channels[0].logo, channels[0].name, channels[0].name);
        } else {
            console.warn("Aucune chaîne trouvée dans channels.json.");
            channelLogo.style.display = 'none';
        }
    })
    .catch(error => {
        console.error("Erreur lors du chargement des chaînes:", error);
        console.error(`Erreur: Impossible de charger les chaînes. Vérifiez 'channels.json'. (${error.message})`);
        channelLogo.style.display = 'none';
    });