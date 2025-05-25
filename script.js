document.addEventListener('DOMContentLoaded', () => {
    const videoContainer = document.getElementById('videoPlayer'); // Le div conteneur principal du lecteur
    const videoElement = document.getElementById('video'); // La balise <video> elle-même
    const videoPlaceholder = document.getElementById('videoPlaceholder'); // Le div de l'image de remplacement

    const channelListDiv = document.getElementById('channelList');
    const currentTimeDiv = document.getElementById('currentTime');

    let hls;
    let channels = [];
    let hasVideoEverPlayed = false; // Indicateur si une vidéo a déjà été lancée

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
            channelItem.setAttribute('data-channel-url', channel.url); // Ajoutez l'URL en tant que data attribute

            const img = document.createElement('img');
            img.src = channel.logo;
            img.alt = channel.name;

            const span = document.createElement('span');
            span.textContent = channel.name;

            channelItem.appendChild(img);
            channelItem.appendChild(span);

            channelItem.addEventListener('click', () => {
                const url = channelItem.getAttribute('data-channel-url');
                const name = channel.name;
                const id = channel.name.replace(/\s/g, '-');
                loadChannel(url, name, id);
            });

            channelListDiv.appendChild(channelItem);
        });
    }

    // Fonction pour charger et lire une chaîne
    function loadChannel(url, channelName, channelId) {
        // Gère la classe 'active' pour la chaîne sélectionnée dans la liste
        document.querySelectorAll('.channel-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeItem = document.querySelector(`.channel-item[data-channel-id="${channelId}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
            activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // ❤️ Logique pour gérer le placeholder et le lecteur vidéo (uniquement au premier lancement)
        if (!hasVideoEverPlayed) {
            if (videoPlaceholder) { // Vérifie que le placeholder existe avant de le manipuler
                videoPlaceholder.classList.add('hidden'); // Cache l'image de remplacement
            }
            if (videoElement) { // Vérifie que la vidéo existe
                videoElement.classList.add('active'); // Rend le lecteur vidéo visible (la balise <video>)
            }
            hasVideoEverPlayed = true; // Met à jour l'état : une vidéo a été lancée
        }

        // Détruire l'instance HLS précédente si elle existe
        if (hls) {
            hls.destroy();
            hls = null;
        }

        if (Hls.isSupported()) {
            hls = new Hls();
            hls.loadSource(url);
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
                if (data.fatal) {
                    console.error("Erreur fatale détectée, tentative de récupération...");
                    if (hls) hls.destroy();
                    hls = null;
                }
            });
        } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
            videoElement.src = url;
            videoElement.addEventListener('loadedmetadata', function() {
                videoElement.play();
            }, { once: true });
            videoElement.addEventListener('error', function() {
                console.error("Erreur de lecture native HLS pour l'URL:", url);
            });
        } else {
            videoElement.src = url;
            videoElement.play();
            console.log("Lecture directe démarrée pour :", url);
            videoElement.addEventListener('error', function() {
                console.error("Erreur de lecture directe pour l'URL:", url);
            });
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

            // ❤️ S'assurer que le placeholder est visible au démarrage et la vidéo cachée
            // Ceci est l'état initial par défaut attendu.
            if (videoElement) videoElement.classList.remove('active'); // Assure que la vidéo est cachée
            if (videoPlaceholder) videoPlaceholder.classList.remove('hidden'); // Assure que le placeholder est visible

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
            // En cas d'erreur de chargement JSON, assurez l'affichage du placeholder
            if (videoElement) videoElement.classList.remove('active');
            if (videoPlaceholder) videoPlaceholder.classList.remove('hidden');
        });

    // ❤️ NOUVEAU : Écouteur de clic sur le placeholder
    // C'est le SEUL endroit qui déclenche le premier lancement de vidéo depuis le placeholder.
    if (videoPlaceholder) {
        videoPlaceholder.addEventListener('click', () => {
            if (!hasVideoEverPlayed) { // S'assure que cela ne se produit qu'une seule fois
                const activeChannelItem = channelListDiv.querySelector('.channel-item.active');
                if (activeChannelItem) {
                    const channelUrl = activeChannelItem.getAttribute('data-channel-url');
                    const channelName = activeChannelItem.querySelector('span').textContent;
                    const channelId = activeChannelItem.getAttribute('data-channel-id');
                    loadChannel(channelUrl, channelName, channelId);
                } else {
                    console.warn("Aucune chaîne sélectionnée pour lancer depuis le placeholder.");
                    // Vous pouvez afficher un message d'information ici
                }
            }
        });
    } else {
        console.error("L'élément #videoPlaceholder n'a pas été trouvé dans le HTML.");
    }
});