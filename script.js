const video = document.getElementById('video');
// const channelLogo = document.getElementById('channelLogo'); // Supprimé
const channelListDiv = document.getElementById('channelList');
const currentTimeDiv = document.getElementById('currentTime');

let hls;
let channels = [];

// Fonction pour mettre à jour l'heure affichée
function updateTime() {
    const now = new Date();
    const options = { hour: '2-digit', minute: '2-digit' };
    const timeString = now.toLocaleTimeString('fr-FR', options);
    currentTimeDiv.textContent = timeString;
}

// Appeler updateTime toutes les secondes pour maintenir l'heure à jour
setInterval(updateTime, 1000);

// Initialiser l'heure au chargement de la page
updateTime();

function populateChannels() {
    channelListDiv.innerHTML = '';
    channels.forEach((channel, index) => {
        const channelItem = document.createElement('div');
        channelItem.classList.add('channel-item');
        channelItem.setAttribute('data-channel-id', channel.name.replace(/\s/g, '-'));

        const img = document.createElement('img');
        img.src = channel.logo; // Le logo est toujours utilisé pour la liste de droite
        img.alt = channel.name;

        const span = document.createElement('span');
        span.textContent = channel.name;

        channelItem.appendChild(img);
        channelItem.appendChild(span);

        channelItem.addEventListener('click', () => {
            // Le paramètre logoUrl n'est plus nécessaire dans loadChannel
            loadChannel(channel.url, channel.name, channel.name.replace(/\s/g, '-')); 
        });

        channelListDiv.appendChild(channelItem);
    });
}

// Fonction pour charger et lire une chaîne
// Le paramètre logoUrl a été supprimé car il n'est plus utilisé ici
function loadChannel(url, channelName, channelId) { 
    // Les lignes qui manipulaient channelLogo sont supprimées d'ici
    // if (logoUrl) { ... } else { ... }

    // Gère la classe 'active' pour la chaîne sélectionnée dans la liste
    document.querySelectorAll('.channel-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeItem = document.querySelector(`.channel-item[data-channel-id="${channelId}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
        // channelLogo.style.display = 'none'; // Supprimé
    }
}


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
            // Le paramètre logoUrl n'est plus nécessaire ici
            loadChannel(channels[0].url, channels[0].name, channels[0].name.replace(/\s/g, '-')); 
        } else {
            console.warn("Aucune chaîne trouvée dans channels.json.");
            // channelLogo.style.display = 'none'; // Supprimé
        }
    })
    .catch(error => {
        console.error("Erreur lors du chargement des chaînes:", error);
        console.error(`Erreur: Impossible de charger les chaînes. Vérifiez 'channels.json'. (${error.message})`);
        // channelLogo.style.display = 'none'; // Supprimé
    });