const video = document.getElementById('video');
const channelLogo = document.getElementById('channelLogo');
const channelListDiv = document.getElementById('channelList');
const currentTimeDiv = document.getElementById('currentTime'); // Nouveau: référence à l'élément de l'heure

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

// -- DÉBUT de la fonction populateChannels() --
// C'est cette fonction qui était manquante ou mal placée !
function populateChannels() {
    channelListDiv.innerHTML = ''; // Vide la liste actuelle avant de la remplir
    channels.forEach((channel, index) => {
        const channelItem = document.createElement('div');
        channelItem.classList.add('channel-item');
        // Utilisez un identifiant unique, par exemple le nom de la chaîne pour data-channel-id
        channelItem.setAttribute('data-channel-id', channel.name.replace(/\s/g, '-')); // Remplace les espaces pour un ID valide

        const img = document.createElement('img');
        img.src = channel.logo;
        img.alt = channel.name;

        const span = document.createElement('span');
        span.textContent = channel.name;

        channelItem.appendChild(img);
        channelItem.appendChild(span);

        channelItem.addEventListener('click', () => {
            loadChannel(channel.url, channel.logo, channel.name, channel.name.replace(/\s/g, '-'));
            // Si vous avez l'EPG, vous appelleriez displayEPGForChannel(channel['tvg-id']); ici
        });

        channelListDiv.appendChild(channelItem);
    });
}
// -- FIN de la fonction populateChannels() --


// Fonction pour charger et lire une chaîne
function loadChannel(url, logoUrl, channelName, channelId) {
    // ... (votre code existant pour loadChannel ici) ...
    // Le code que vous avez fourni pour loadChannel est correct et est inséré ici
    
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
        populateChannels(); // Appel de la fonction maintenant définie
        if (channels.length > 0) {
            loadChannel(channels[0].url, channels[0].logo, channels[0].name, channels[0].name.replace(/\s/g, '-')); // Charge la première chaîne
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