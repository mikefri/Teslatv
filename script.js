document.addEventListener('DOMContentLoaded', () => {
    // Récupération des éléments du DOM
    const videoContainer = document.getElementById('videoPlayer');
    const videoElement = document.getElementById('video');
    const iframePlayer = document.getElementById('iframePlayer');
    const videoPlaceholder = document.getElementById('videoPlaceholder');
    const channelListDiv = document.getElementById('channelList');
    const currentTimeDiv = document.getElementById('currentTime');
    const messageBox = document.getElementById('messageBox');
    const messageText = document.getElementById('messageText');
    const closeMessage = document.getElementById('closeMessage');

    // NOUVEAU : Récupération du sélecteur de catégorie
    const categorySelect = document.getElementById('category-select');

    let hlsInstance = null;
    let channels = [];
    let hasVideoEverPlayed = false;
    let currentCategory = 'all'; // Ajout d'une variable pour la catégorie actuelle

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

    // NOUVEAU : Fonction pour peupler le sélecteur de catégories
    function populateCategorySelect(allChannels) {
        if (!categorySelect) return; // S'assurer que le sélecteur existe

        const categories = new Set();
        allChannels.forEach(channel => {
            if (channel.category) {
                categories.add(channel.category);
            }
        });

        // Vider toutes les options sauf "Toutes les chaînes"
        categorySelect.innerHTML = '<option value="all">Toutes les chaînes</option>';

        // Ajouter les catégories triées
        Array.from(categories).sort().forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });

        // Restaurer la sélection précédente si elle existe
        if (currentCategory && categorySelect.querySelector(`option[value="${currentCategory}"]`)) {
            categorySelect.value = currentCategory;
        } else {
            categorySelect.value = 'all';
            currentCategory = 'all';
        }
    }

    // NOUVEAU : Fonction pour filtrer et afficher les chaînes
    function filterAndDisplayChannels(category) {
        currentCategory = category; // Met à jour la catégorie actuelle
        let filteredChannels = [];

        if (category === 'all') {
            filteredChannels = channels;
        } else {
            filteredChannels = channels.filter(channel => channel.category === category);
        }

        if (channelListDiv) {
            channelListDiv.innerHTML = ''; // Nettoyer la liste existante
        }

        if (filteredChannels.length === 0) {
            const noChannelsMessage = document.createElement('div');
            noChannelsMessage.textContent = "Aucune chaîne disponible dans cette catégorie.";
            noChannelsMessage.style.textAlign = "center";
            noChannelsMessage.style.padding = "20px";
            noChannelsMessage.style.color = "#888";
            channelListDiv.appendChild(noChannelsMessage);
            return;
        }

        filteredChannels.forEach((channel) => {
            const channelItem = document.createElement('div');
            channelItem.classList.add('channel-item');
            channelItem.setAttribute('data-channel-id', channel.name.replace(/\s/g, '-'));
            channelItem.setAttribute('data-channel-url', channel.url);

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
        // Si une chaîne est déjà active et se trouve dans la nouvelle liste filtrée, la re-sélectionner
        const previouslyActiveChannelId = document.querySelector('.channel-item.active')?.getAttribute('data-channel-id');
        if (previouslyActiveChannelId) {
            const newActiveItem = document.querySelector(`.channel-item[data-channel-id="${previouslyActiveChannelId}"]`);
            if (newActiveItem) {
                newActiveItem.classList.add('active');
            }
        }
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
            hasVideoEverPlayed = true;
        }

        // --- NOUVELLE LOGIQUE POUR CHOISIR ENTRE VIDEO ET IFRAME ---
        const isPlayerPage = originalUrl.includes('/player/') || originalUrl.includes('tutvlive.ru/player/');

        // Cache les deux éléments et réinitialise HLS.js
        if (hlsInstance) {
            hlsInstance.destroy();
            hlsInstance = null;
        }
        videoElement.src = '';
        videoElement.removeAttribute('type');
        videoElement.load();
        videoElement.classList.remove('active');
        iframePlayer.src = ''; // Vide l'iframe
        iframePlayer.classList.remove('active');


        if (isPlayerPage) {
            console.log(`[Client] Chargement de la page de lecteur via iframe pour : ${originalUrl}`);
            iframePlayer.src = originalUrl;
            iframePlayer.classList.add('active');
        } else {
            console.log(`[Client] Tentative de chargement direct de : ${originalUrl}`);
            videoElement.classList.add('active');

            let finalUrl = originalUrl;
            let useHlsJs = false;

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
                        hideMessage();
                    });

                    hlsInstance.on(Hls.Events.ERROR, function(event, data) {
                        console.error('Erreur HLS:', data);

                        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && data.details === Hls.ErrorDetails.LEVEL_LOAD_ERROR && !data.fatal) {
                            console.warn(`[Client] LevelLoadError non fatal pour ${channelName} détecté et sera ignoré (la lecture devrait continuer).`);
                            hideMessage();
                        } else if (data.fatal) {
                            console.error("Erreur fatale détectée, tentative de récupération...");
                            if (hlsInstance) {
                                hlsInstance.destroy();
                                hlsInstance = null;
                            }
                            console.log(`[Client] hls.js a échoué fatalement. Tentative de lecture native en dernier recours pour : ${finalUrl}`);
                            videoElement.src = finalUrl;
                            videoElement.type = 'video/mp2t';
                            videoElement.play().catch(e => console.error("Erreur de lecture native (fallback HLS):", e));
                        }
                    });

                } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
                    console.log(`[Client] Lecture HLS native pour : ${finalUrl}`);
                    videoElement.src = finalUrl;
                    videoElement.play().catch(e => console.error("Erreur de lecture native (HLS):", e));
                    hideMessage();
                } else {
                    console.error('Le navigateur ne supporte pas HLS et hls.js ne peut pas être utilisé.');
                }
            } else {
                console.log(`[Client] Tentative de lecture native (non-HLS) pour : ${finalUrl}`);
                videoElement.src = finalUrl;
                videoElement.removeAttribute('type');

                videoElement.play().catch(e => {
                    console.error("Erreur de lecture native (non-HLS):", e);
                });
            }
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
            populateCategorySelect(channels); // NOUVEAU : Peupler le sélecteur de catégories
            filterAndDisplayChannels(currentCategory); // NOUVEAU : Afficher les chaînes filtrées (par défaut "all")


            // Initialement, cache la vidéo et l'iframe, montre le placeholder
            if (videoElement) videoElement.classList.remove('active');
            if (iframePlayer) iframePlayer.classList.remove('active');
            if (videoPlaceholder) videoPlaceholder.classList.remove('hidden');

            if (channels.length > 0) {
                // La sélection de la première chaîne active se fera via filterAndDisplayChannels
                // On peut le laisser ici pour la première initialisation après le chargement des données
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
            if (videoElement) videoElement.classList.remove('active');
            if (iframePlayer) iframePlayer.classList.remove('active');
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
                }
            }
        });
    } else {
        console.error("L'élément #videoPlaceholder n'a pas été trouvé dans le HTML.");
    }

    // NOUVEAU : Écouteur d'événements pour le changement de catégorie
    if (categorySelect) {
        categorySelect.addEventListener('change', (event) => {
            const selectedCategory = event.target.value;
            filterAndDisplayChannels(selectedCategory);
        });
    }
});