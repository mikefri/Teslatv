// script.js

document.addEventListener('DOMContentLoaded', () => {
    // Récupération des éléments du DOM
    const videoContainer = document.getElementById('videoPlayer');
    const videoElement = document.getElementById('video');
    const videoPlaceholder = document.getElementById('videoPlaceholder');
    const channelListDiv = document.getElementById('channelList');
    const currentTimeDiv = document.getElementById('currentTime');
    const messageBox = document.getElementById('messageBox');
    const messageText = document.getElementById('messageText');
    const closeMessage = document.getElementById('closeMessage');

    let hls; // Instance HLS.js
    let channels = []; // Liste des chaînes chargées depuis channels.json
    let hasVideoEverPlayed = false; // Indicateur pour la première lecture de vidéo

    // IMPORTANT : REMPLACEZ 'https://proxy-teslatv-xxxx.vercel.app/proxy-stream?url='
    // par l'URL exacte de votre proxy Vercel que vous avez obtenue après le déploiement.
    // L'URL devrait commencer par 'https://proxy-teslatv-' et se terminer par '/proxy-stream?url='
    const PROXY_BASE_URL = 'https://proxy-tesla-tv.vercel.app/api?url=';


    // Fonction pour afficher une boîte de message personnalisée
    function showMessage(message) {
        messageText.textContent = message;
        messageBox.classList.remove('hidden');
    }

    // Fonction pour masquer la boîte de message
    function hideMessage() {
        messageBox.classList.add('hidden');
    }

    // Écouteur pour fermer la boîte de message
    if (closeMessage) {
        closeMessage.addEventListener('click', hideMessage);
    }

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

    // Fonction pour peupler la liste des chaînes
    function populateChannels() {
        channelListDiv.innerHTML = ''; // Nettoyer la liste existante
        channels.forEach((channel, index) => {
            const channelItem = document.createElement('div');
            channelItem.classList.add('channel-item');
            channelItem.setAttribute('data-channel-id', channel.name.replace(/\s/g, '-'));
            channelItem.setAttribute('data-channel-url', channel.url);

            const img = document.createElement('img');
            img.src = channel.logo;
            img.alt = channel.name;

            const nameSpan = document.createElement('span');
            nameSpan.textContent = channel.name;
            nameSpan.classList.add('channel-name'); // Ajout de la classe pour la récupération du nom

            // Indicateur VPN
            const vpnIndicator = document.createElement('span');
            vpnIndicator.classList.add('vpn-indicator');
            vpnIndicator.setAttribute('data-needs-vpn', channel.needsVPN ? 'true' : 'false');

            channelItem.appendChild(img);
            channelItem.appendChild(nameSpan);
            channelItem.appendChild(vpnIndicator);

            // Ajout de l'écouteur de clic pour charger la chaîne
            channelItem.addEventListener('click', () => {
                const url = channelItem.getAttribute('data-channel-url');
                const name = channel.name;
                const id = channel.name.replace(/\s/g, '-');
                loadChannel(url, name, id);
            });

            channelListDiv.appendChild(channelItem);
        });
    }

    // Fonction principale pour charger et lire une chaîne
    function loadChannel(url, channelName, channelId) {
        // Gère la classe 'active' pour la chaîne sélectionnée
        document.querySelectorAll('.channel-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeItem = document.querySelector(`.channel-item[data-channel-id="${channelId}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
            activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Logique pour gérer le placeholder et le lecteur vidéo
        if (!hasVideoEverPlayed) {
            if (videoPlaceholder) {
                videoPlaceholder.classList.add('hidden');
            }
            if (videoElement) {
                videoElement.classList.add('active');
            }
            hasVideoEverPlayed = true;
        }

        // --- DÉBUT DE LA MODIFICATION CLÉ POUR LE PROXY ---
        let finalUrl = url;
        // Si l'URL du flux est HTTP, nous la faisons passer par le proxy Vercel
        if (url.startsWith('http://')) {
            // Encode l'URL du flux original pour qu'elle puisse être passée comme paramètre d'URL
            const encodedUrl = encodeURIComponent(url);
            finalUrl = PROXY_BASE_URL + encodedUrl;
            console.log(`[Client] Redirection du flux HTTP via le proxy : ${finalUrl}`);
        } else {
            console.log(`[Client] Chargement direct du flux (déjà HTTPS ou local) : ${url}`);
        }
        // --- FIN DE LA MODIFICATION CLÉ POUR LE PROXY ---


        // Détruire l'instance HLS précédente si elle existe
        if (hls) {
            hls.destroy();
            hls = null;
        }

        // Logique de lecture HLS ou native
        // Utilisez toujours 'finalUrl' ici !
        if (Hls.isSupported()) {
            hls = new Hls();
            hls.loadSource(finalUrl); // Utilisez finalUrl ici
            hls.attachMedia(videoElement);
            hls.on(Hls.Events.MANIFEST_PARSED, function() {
                hls.subtitleTrack = -1; // Désactiver les sous-titres HLS par défaut
                console.log("Subtitles disabled via hls.subtitleTrack = -1");

                if (videoElement.textTracks) {
                    for (let i = 0; i < videoElement.textTracks.length; i++) {
                        if (videoElement.textTracks[i].mode !== 'disabled') {
                            videoElement.textTracks[i].mode = 'disabled';
                            console.log(`Piste de sous-titre ${videoElement.textTracks[i].label || i} désactivée.`);
                        }
                    }
                }
                videoElement.play();
            });
            hls.on(Hls.Events.ERROR, function (event, data) {
                console.error('Erreur HLS:', data);
                // Afficher une erreur plus conviviale pour l'utilisateur
                if (data.type === 'networkError' && data.details === 'manifestLoadError') {
                    showMessage(`Erreur de lecture de la chaîne: Impossible de charger le flux vidéo. Vérifiez votre connexion, l'URL du proxy ou essayez une autre chaîne.`);
                } else {
                    showMessage(`Une erreur est survenue lors de la lecture de la chaîne: ${data.details || 'Erreur inconnue'}.`);
                }

                if (data.fatal) {
                    console.error("Erreur fatale détectée, tentative de récupération...");
                    if (hls) hls.destroy();
                    hls = null;
                }
            });
        } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
            // Lecture native HLS pour les navigateurs compatibles (Safari)
            videoElement.src = finalUrl; // Utilisez finalUrl ici
            videoElement.addEventListener('loadedmetadata', function() {
                videoElement.play();
            }, { once: true });
            videoElement.addEventListener('error', function() {
                console.error("Erreur de lecture native HLS pour l'URL:", finalUrl);
                showMessage(`Impossible de lire cette chaîne (erreur native du navigateur).`);
            });
        } else {
            // Lecture directe pour d'autres formats ou navigateurs non HLS
            videoElement.src = finalUrl; // Utilisez finalUrl ici
            videoElement.play();
            console.log("Lecture directe démarrée pour :", finalUrl);
            videoElement.addEventListener('error', function() {
                console.error("Erreur de lecture directe pour l'URL:", finalUrl);
                showMessage(`Impossible de lire cette chaîne (erreur de lecture directe).`);
            });
        }
    }

    // Chargement des chaînes depuis le fichier JSON
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

            // S'assurer que le placeholder est visible au démarrage et la vidéo cachée
            if (videoElement) videoElement.classList.remove('active');
            if (videoPlaceholder) videoPlaceholder.classList.remove('hidden');

            // Optionnel : Sélectionnez la première chaîne comme "active" par défaut visuellement,
            // mais ne la lancez pas encore.
            if (channels.length > 0) {
                const firstChannelItem = channelListDiv.querySelector('.channel-item');
                if (firstChannelItem) {
                    firstChannelItem.classList.add('active');
                }
            } else {
                console.warn("Aucune chaîne trouvée dans channels.json.");
            }
        })
        .catch(error => {
            console.error("Erreur lors du chargement des chaînes:", error);
            console.error(`Erreur: Impossible de charger les chaînes. Vérifiez 'channels.json'. (${error.message})`);
            showMessage(`Erreur au chargement des chaînes: Vérifiez le fichier 'channels.json'.`);
            // En cas d'erreur de chargement JSON, assurez l'affichage du placeholder
            if (videoElement) videoElement.classList.remove('active');
            if (videoPlaceholder) videoPlaceholder.classList.remove('hidden');
        });

    // Écouteur de clic sur le placeholder pour lancer la première chaîne active
    if (videoPlaceholder) {
        videoPlaceholder.addEventListener('click', () => {
            if (!hasVideoEverPlayed) {
                const activeChannelItem = channelListDiv.querySelector('.channel-item.active');
                if (activeChannelItem) {
                    const channelUrl = activeChannelItem.getAttribute('data-channel-url');
                    // Assurez-vous que le sélecteur est correct pour le nom
                    const channelName = activeChannelItem.querySelector('.channel-name').textContent; 
                    const channelId = activeChannelItem.getAttribute('data-channel-id');
                    loadChannel(channelUrl, channelName, channelId);
                } else {
                    console.warn("Aucune chaîne sélectionnée pour lancer depuis le placeholder.");
                    showMessage("Veuillez sélectionner une chaîne dans la liste pour commencer la lecture.");
                }
            }
        });
    } else {
        console.error("L'élément #videoPlaceholder n'a pas été trouvé dans le HTML.");
    }
});
