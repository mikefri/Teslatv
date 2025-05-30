document.addEventListener('DOMContentLoaded', () => {
    // Récupération des éléments du DOM
    const videoContainer = document.getElementById('videoPlayer');
    const videoElement = document.getElementById('video'); // Assurez-vous que l'ID est 'video'
    const videoPlaceholder = document.getElementById('videoPlaceholder');
    const channelListDiv = document.getElementById('channelList');
    const currentTimeDiv = document.getElementById('currentTime');
    const messageBox = document.getElementById('messageBox');
    const messageText = document.getElementById('messageText');
    const closeMessage = document.getElementById('closeMessage');

    let hlsInstance = null;
    let channels = [];
    let hasVideoEverPlayed = false;

    // --- L'URL du proxy n'est plus nécessaire, je l'ai commentée. ---
    // const PROXY_BASE_URL = 'https://proxy-tesla-tv.vercel.app/api?url=';


    // Fonction pour afficher une boîte de message personnalisée
    function showMessage(message) {
        if (messageText) {
            messageText.textContent = message;
        } else {
            console.error("L'élément 'messageText' n'a pas été trouvé dans le DOM.");
        }
        if (messageBox) {
            messageBox.classList.remove('hidden');
        } else {
            console.error("L'élément 'messageBox' n'a pas été trouvé dans le DOM.");
        }
    }

    // Fonction pour masquer la boîte de message
    function hideMessage() {
        if (messageBox) {
            messageBox.classList.add('hidden');
        }
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
        if (currentTimeDiv) {
            currentTimeDiv.textContent = timeString;
        }
    }

    // Appeler updateTime toutes les secondes pour maintenir l'heure à jour
    setInterval(updateTime, 1000);

    // Initialiser l'heure au chargement de la page
    updateTime();

    // Fonction pour peupler la liste des chaînes
    function populateChannels() {
        if (channelListDiv) {
            channelListDiv.innerHTML = ''; // Nettoyer la liste existante
        }
        channels.forEach((channel, index) => {
            const channelItem = document.createElement('div');
            channelItem.classList.add('channel-item');
            channelItem.setAttribute('data-channel-id', channel.name.replace(/\s/g, '-'));
            channelItem.setAttribute('data-channel-url', channel.url); // originalUrl sera ici

            const img = document.createElement('img');
            img.src = channel.logo;
            img.alt = channel.name;

            const nameSpan = document.createElement('span');
            nameSpan.textContent = channel.name;
            nameSpan.classList.add('channel-name');

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

            if (channelListDiv) {
                channelListDiv.appendChild(channelItem);
            }
        });
    }

    // Fonction principale pour charger et lire une chaîne
    function loadChannel(originalUrl, channelName, channelId) {
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

        // --- Détruire HLS.js et réinitialiser l'élément vidéo avant de charger un nouveau flux ---
        if (hlsInstance) {
            hlsInstance.destroy();
            hlsInstance = null;
        }
        videoElement.src = '';
        videoElement.removeAttribute('type');
        videoElement.load();
        // --- Fin du nettoyage ---

        // --- Changement ici : on utilise directement originalUrl au lieu de finalUrl ---
        let finalUrl = originalUrl;
        let useHlsJs = false;

        // Le proxy n'est plus utilisé, donc cette ligne est supprimée
        // const encodedUrl = encodeURIComponent(originalUrl);
        // finalUrl = PROXY_BASE_URL + encodedUrl;
        console.log(`[Client] Tentative de chargement direct de : ${finalUrl}`); // Message de log mis à jour

        if (originalUrl.includes('.m3u8') || originalUrl.includes('/stream/') || originalUrl.includes('radioswebmp3.synology.me')) {
            useHlsJs = true;
        }

        if (useHlsJs) {
            console.log(`[Client] Tentative de lecture HLS avec hls.js pour : ${finalUrl}`);
            if (Hls.isSupported()) {
                hlsInstance = new Hls();
                hlsInstance.loadSource(finalUrl);
                hlsInstance.attachMedia(videoElement);
                hlsInstance.on(Hls.Events.MANIFEST_PARSED, function() {
                    hlsInstance.subtitleTrack = -1;
                    console.log("Subtitles disabled via hls.subtitleTrack = -1");

                    if (videoElement.textTracks) {
                        for (let i = 0; i < videoElement.textTracks.length; i++) {
                            if (videoElement.textTracks[i].mode !== 'disabled') {
                                videoElement.textTracks[i].mode = 'disabled';
                                console.log(`Piste de sous-titre ${videoElement.textTracks[i].label || i} désactivée.`);
                            }
                        }
                    }
                    videoElement.play().catch(e => console.error("Erreur de lecture vidéo (play) après MANIFEST_PARSED:", e));
                });

                hlsInstance.on(Hls.Events.ERROR, function(event, data) {
                    console.error('Erreur HLS:', data);

                    // Vérifiez si l'erreur est un levelLoadError NON fatal
                    if (data.type === Hls.ErrorTypes.NETWORK_ERROR && data.details === Hls.ErrorDetails.LEVEL_LOAD_ERROR && !data.fatal) {
                        console.warn(`[Client] LevelLoadError non fatal pour ${channelName} détecté et sera ignoré (la lecture devrait continuer).`);
                        // Cacher le message d'erreur si la chaîne continue de jouer
                        hideMessage(); // <--- Appelle votre fonction pour masquer la boîte
                        // Ne pas afficher de nouveau message pour cette erreur
                    } else if (data.fatal) {
                        // Pour les erreurs fatales, vous voulez toujours afficher un message ou tenter une récupération
                        console.error("Erreur fatale détectée, tentative de récupération...");
                        if (hlsInstance) {
                            hlsInstance.destroy();
                            hlsInstance = null;
                        }
                        showMessage(`Erreur de lecture fatale pour ${channelName}: ${data.details || 'Erreur inconnue'}. Tentative de fallback...`);
                        console.log(`[Client] hls.js a échoué fatalement. Tentative de lecture native en dernier recours pour : ${finalUrl}`);
                        videoElement.src = finalUrl;
                        videoElement.type = 'video/mp2t'; // Spécifier le type MIME pour aider le navigateur
                        videoElement.play().catch(e => console.error("Erreur de lecture native (fallback HLS):", e));
                    } else {
                        // Pour les autres erreurs non fatales qui ne sont pas levelLoadError (si vous voulez les afficher)
                        showMessage(`Erreur de lecture pour ${channelName}: ${data.details || 'Erreur inconnue'}.`);
                    }
                });

            } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
                // Lecture native HLS pour les navigateurs compatibles (Safari)
                console.log(`[Client] Lecture HLS native pour : ${finalUrl}`);
                videoElement.src = finalUrl;
                videoElement.play().catch(e => console.error("Erreur de lecture native (HLS):", e));
            } else {
                console.error('Le navigateur ne supporte pas HLS et hls.js ne peut pas être utilisé.');
                showMessage(`Votre navigateur ne supporte pas la lecture HLS. Veuillez essayer avec un autre navigateur.`);
            }
        } else {
            console.log(`[Client] Tentative de lecture native (non-HLS, non-TS traité par hls.js) pour : ${finalUrl}`);
            videoElement.src = finalUrl;
            videoElement.removeAttribute('type');

            videoElement.play().catch(e => {
                console.error("Erreur de lecture native (non-HLS):", e);
                showMessage(`Impossible de lire la chaîne ${channelName} nativement. Format non supporté ou erreur de lecture. (${e.message})`);
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

            if (videoElement) videoElement.classList.remove('active');
            if (videoPlaceholder) videoPlaceholder.classList.remove('hidden');

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