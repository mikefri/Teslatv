const video = document.getElementById('video');
// const channelSelect = document.getElementById('channelSelect'); // Plus besoin de ce sélecteur
const statusMessage = document.getElementById('statusMessage');
const channelLogo = document.getElementById('channelLogo');
const channelListDiv = document.getElementById('channelList'); // Nouveau : référence à la liste des chaînes
let hls;
let channels = [];

// Fonction pour charger et lire une chaîne
// Ajout de channelId pour identifier la chaîne active
function loadChannel(url, logoUrl, channelName, channelId) {
    statusMessage.textContent = `Chargement de ${channelName || 'la chaîne'}...`;

    // Met à jour l'image du logo et la visibilité
    if (logoUrl) {
        channelLogo.src = logoUrl;
        channelLogo.alt = `Logo de ${channelName || 'la chaîne'}`;
        channelLogo.style.display = 'block';
    } else {
        channelLogo.src = '';
        channelLogo.alt = '';
        channelLogo.style.display = 'none';
    }

    // Gère la classe 'active' pour la chaîne sélectionnée dans la liste
    document.querySelectorAll('.channel-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeItem = document.querySelector(`.channel-item[data-channel-id="${channelId}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
        // Optionnel: Faire défiler la liste pour rendre l'élément actif visible
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
            // Désactiver tous les sous-titres via la propriété HLS.js
            // Mettre ceci AVANT video.play() pour s'assurer qu'ils sont désactivés dès le début
            hls.subtitleTrack = -1; // -1 est la valeur pour "aucun sous-titre"
            console.log("Subtitles disabled via hls.subtitleTrack = -1"); // Pour le débogage

            // Une vérification additionnelle sur les pistes natives du lecteur HTML5 (au cas où)
            if (video.textTracks) {
                for (let i = 0; i < video.textTracks.length; i++) {
                    if (video.textTracks[i].mode !== 'disabled') { // Évite de faire des changements inutiles
                        video.textTracks[i].mode = 'disabled';
                        console.log(`Piste de sous-titre ${video.textTracks[i].label || i} désactivée.`); // Pour le débogage
                    }
                }
            }
            
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
        channelLogo.style.display = 'none';
    }
}

// Remplir la liste des chaînes avec des logos cliquables
function populateChannels() {
    channelListDiv.innerHTML = ''; // Vide la liste existante
    channels.forEach((channel, index) => {
        const channelItem = document.createElement('div');
        channelItem.classList.add('channel-item');
        // Utilisez un attribut de données pour stocker un identifiant unique (ici, le nom est utilisé comme ID pour simplifier)
        channelItem.dataset.channelId = channel.name;

        const logoImg = document.createElement('img');
        logoImg.src = channel.logo || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23666"/><text x="50" y="50" font-family="Arial" font-size="30" fill="%23eee" text-anchor="middle" dominant-baseline="central">?</text></svg>'; // Fallback SVG pour les logos manquants
        logoImg.alt = `Logo ${channel.name}`;
        channelItem.appendChild(logoImg);

        const channelNameSpan = document.createElement('span');
        channelNameSpan.textContent = channel.name;
        channelItem.appendChild(channelNameSpan);

        // Attachez l'écouteur d'événement au clic sur l'élément de la chaîne
        channelItem.addEventListener('click', () => {
            loadChannel(channel.url, channel.logo, channel.name, channel.name);
        });

        channelListDiv.appendChild(channelItem);
    });
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
        populateChannels(); // Remplir la nouvelle liste de chaînes
        if (channels.length > 0) {
            // Charger la première chaîne au démarrage, y compris son logo et son nom, et son ID
            loadChannel(channels[0].url, channels[0].logo, channels[0].name, channels[0].name);
        } else {
            statusMessage.textContent = "Aucune chaîne trouvée dans channels.json.";
            channelLogo.style.display = 'none';
        }
    })
    .catch(error => {
        console.error("Erreur lors du chargement des chaînes:", error);
        statusMessage.textContent = `Erreur: Impossible de charger les chaînes. Vérifiez 'channels.json'. (${error.message})`;
        channelLogo.style.display = 'none';
    });