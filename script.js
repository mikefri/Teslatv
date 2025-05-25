document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video'); // La balise <video>
    const videoPlaceholder = document.getElementById('videoPlaceholder'); // Le div de l'image de remplacement
    const channelListDiv = document.getElementById('channelList'); // Le conteneur de la liste des chaînes
    const currentTimeDiv = document.getElementById('currentTime'); // L'affichage de l'heure

    let hls;
    let channels = [];
    let hasVideoEverPlayed = false; // ❤️ NOUVEAU : Indicateur si une vidéo a déjà été lancée

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
                // Pas besoin de passer l'URL ici, on la récupérera via le data attribute dans loadChannel
                // C'est juste pour s'assurer que loadChannel est appelé avec les bonnes infos
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

        // ❤️ Logique pour gérer le placeholder et le lecteur vidéo
        if (!hasVideoEverPlayed) {
            // C'est la première fois qu'une vidéo est lancée
            videoPlaceholder.classList.add('hidden'); // Cache l'image de remplacement
            video.classList.add('active'); // Rend le lecteur vidéo visible
            hasVideoEverPlayed = true; // Met à jour l'état : une vidéo a été lancée
        }
        // Pour les changements de chaîne ultérieurs, assurez-vous que le placeholder reste caché
        // et que la vidéo reste visible.
        if (!videoPlaceholder.classList.contains('hidden')) {
            videoPlaceholder.classList.add('hidden');
        }
        if (!video.classList.contains('active')) {
            video.classList.add('active');
        }


        // Détruire l'instance HLS précédente si elle existe
        if (hls) {
            hls.destroy();
            hls = null;
        }

        if (Hls.isSupported()) {
            hls = new Hls();
            hls.loadSource(url);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, function() {
                hls.subtitleTrack = -1; // Désactiver les sous-titres HLS par défaut
                console.log("Subtitles disabled via hls.subtitleTrack = -1");

                // Désactiver toutes les pistes de texte vidéo HTML5
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
                    // Optionnel: Afficher un message d'erreur ou revenir au placeholder si fatal
                }
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Support natif HLS pour Safari/iOS
            video.src = url;
            video.addEventListener('loadedmetadata', function() {
                video.play();
            }, { once: true }); // Utilise { once: true } pour éviter des écouteurs multiples
            video.addEventListener('error', function() {
                console.error("Erreur de lecture native HLS pour l'URL:", url);
                // Optionnel: Gérer l'erreur
            });
        } else {
            // Fallback pour les MP4 directs (si l'URL n'est pas HLS)
            video.src = url;
            video.play();
            console.log("Lecture directe démarrée pour :", url);
            video.addEventListener('error', function() {
                console.error("Erreur de lecture directe pour l'URL:", url);
                // Optionnel: Gérer l'erreur
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
            
            // ❤️ Au chargement initial, aucune chaîne n'est jouée automatiquement.
            // La vidéo est masquée, le placeholder est visible.
            video.classList.remove('active'); // S'assurer que la vidéo est cachée initialement
            videoPlaceholder.classList.remove('hidden'); // S'assurer que le placeholder est visible initialement

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
            // Assurez-vous que le placeholder est visible en cas d'erreur de chargement des chaînes
            video.classList.remove('active');
            videoPlaceholder.classList.remove('hidden');
        });

    // ❤️ NOUVEAU : Écouteur de clic sur le placeholder
    // C'est le SEUL endroit qui déclenche le premier lancement de vidéo depuis le placeholder.
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
                // Optionnel : Afficher un message à l'utilisateur pour qu'il sélectionne une chaîne
            }
        }
    });

});