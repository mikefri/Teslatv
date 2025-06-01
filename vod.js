document.addEventListener('DOMContentLoaded', () => {
    // URL de votre fichier M3U et de votre proxy Vercel
    const m3uUrl = 'https://mikefri.github.io/Teslatv/vod.m3u';
    const proxyUrl = 'https://proxy-tesla-tv.vercel.app/api'; // Assurez-vous que votre proxy est opérationnel

    // Références aux éléments DOM
    const movieListDiv = document.getElementById('movie-list');
    const videoPlayer = document.getElementById('video-player');
    const loadingMessage = document.getElementById('loading-message');
    const searchInput = document.getElementById('search-input'); // Champ de recherche

    // Stockage de tous les films chargés initialement
    let allMovies = [];

    // --- Vérification des éléments DOM requis au démarrage ---
    if (!movieListDiv || !videoPlayer || !loadingMessage) {
        console.error('Erreur: Un ou plusieurs éléments DOM requis sont manquants. Assurez-vous que les IDs "movie-list", "video-player" et "loading-message" existent dans votre HTML.');
        loadingMessage.textContent = 'Erreur: Éléments de l\'interface utilisateur manquants. Veuillez vérifier votre HTML.';
        loadingMessage.style.color = 'red';
        return; // Arrête l'exécution si les éléments essentiels ne sont pas trouvés
    }

    // --- Ajout d'écouteurs d'événements au lecteur vidéo pour le diagnostic ---
    videoPlayer.addEventListener('loadedmetadata', () => {
        console.log('--- Événement Vidéo: loadedmetadata ---');
        console.log(`Dimensions de la vidéo: ${videoPlayer.videoWidth}x${videoPlayer.videoHeight}`);
        console.log(`Durée de la vidéo: ${videoPlayer.duration} secondes`);
        if (videoPlayer.videoWidth === 0 && videoPlayer.videoHeight === 0) {
            console.warn('ATTENTION: Les dimensions de la vidéo sont 0x0. La vidéo pourrait ne pas être rendue ou décodée correctement.');
        }
    });

    videoPlayer.addEventListener('play', () => {
        console.log('--- Événement Vidéo: play --- La lecture a démarré ou a repris.');
    });

    videoPlayer.addEventListener('playing', () => {
        console.log('--- Événement Vidéo: playing --- La vidéo est en cours de lecture.');
    });

    videoPlayer.addEventListener('pause', () => {
        console.log('--- Événement Vidéo: pause --- La vidéo est en pause.');
    });

    videoPlayer.addEventListener('ended', () => {
        console.log('--- Événement Vidéo: ended --- La vidéo est terminée.');
    });

    videoPlayer.addEventListener('error', (event) => {
        console.error('--- Événement Vidéo: ERROR ---');
        const error = event.target.error; // C'est un objet MediaError
        let errorMessage = 'Erreur vidéo inconnue.';
        switch (error.code) {
            case error.MEDIA_ERR_ABORTED:
                errorMessage = 'La lecture vidéo a été interrompue.';
                break;
            case error.MEDIA_ERR_NETWORK:
                errorMessage = 'Une erreur réseau a empêché le téléchargement de la vidéo.';
                break;
            case error.MEDIA_ERR_DECODE:
                errorMessage = 'Une erreur de décodage a empêché la lecture de la vidéo. Codec non supporté ?';
                break;
            case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                errorMessage = 'Le format vidéo ou la source n\'est pas supportée par le navigateur.';
                break;
            default:
                errorMessage = `Erreur vidéo inattendue (Code: ${error.code}).`;
                break;
        }
        console.error(`Message d'erreur vidéo: ${errorMessage} - Détails: ${error.message || 'Aucun message spécifique.'}`);
        alert(`Erreur de lecture vidéo: ${errorMessage}\nVeuillez consulter la console du navigateur pour plus de détails.`);
    });

    videoPlayer.addEventListener('stalled', () => {
        console.warn('--- Événement Vidéo: stalled --- Le téléchargement des données vidéo est interrompu.');
    });

    videoPlayer.addEventListener('waiting', () => {
        console.log('--- Événement Vidéo: waiting --- Le lecteur attend des données pour continuer la lecture.');
    });

    // --- Fin des écouteurs d'événements vidéo ---

    // --- Fonction pour charger et parser le fichier M3U ---
    fetch(m3uUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erreur réseau lors du chargement du fichier M3U: ${response.status} ${response.statusText}`);
            }
            return response.text();
        })
        .then(data => {
            loadingMessage.style.display = 'none'; // Cache le message de chargement une fois les données reçues
            const lines = data.split('\n');
            let currentMovie = {};

            lines.forEach(line => {
                line = line.trim();
                if (line.startsWith('#EXTINF:')) {
                    // Extraction du titre et du logo
                    const tvgNameMatch = line.match(/tvg-name="([^"]*)"/);
                    const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/);

                    let rawTitle = tvgNameMatch ? tvgNameMatch[1] : 'Titre inconnu';
                    const logo = tvgLogoMatch ? tvgLogoMatch[1] : '';

                    // NOUVEAU: Nettoyage du titre avec la logique du regex.
                    // Assurez-vous que le '#' est aussi supprimé si c'est "FR:#"
                    let cleanedTitle = rawTitle.replace(/^FR:#?\s*/i, '').trim(); 
                    // ^FR:      -> Cherche "FR:" au début de la chaîne
                    // #?       -> Cherche un "#" zéro ou une fois (c'est-à-dire, il peut être là ou non)
                    // \s* -> Cherche zéro ou plusieurs espaces après "FR:#" ou "FR:"
                    // i        -> Rend la recherche insensible à la casse (fr:, FR:, Fr:)
                    // .trim()  -> Supprime les espaces blancs au début et à la fin

                    currentMovie = {
                        title: cleanedTitle, // <<< UTILISEZ cleanedTitle ICI !!!
                        logo: logo,
                        url: '' // L'URL sera sur la ligne suivante
                    };
                } else if (line.startsWith('http')) {
                    if (currentMovie.title) { // S'assure qu'un film est en cours de définition
                        currentMovie.url = line;
                        allMovies.push(currentMovie); // Stocke le film dans le tableau global
                        currentMovie = {}; // Réinitialise pour le prochain film
                    }
                }
            });

            // Affiche tous les films au premier chargement
            displayMovies(allMovies);

            if (allMovies.length === 0) {
                loadingMessage.style.display = 'block';
                loadingMessage.textContent = 'Aucun film trouvé dans le fichier M3U.';
                loadingMessage.style.color = 'orange';
            }
        })
        .catch(error => {
            console.error('Erreur lors du traitement du fichier M3U:', error);
            loadingMessage.style.display = 'block';
            loadingMessage.textContent = `Erreur lors du chargement des films: ${error.message}. Veuillez réessayer plus tard.`;
            loadingMessage.style.color = 'red';
        });

    // --- Écouteur d'événement pour la recherche ---
    if (searchInput) {
        searchInput.addEventListener('input', (event) => {
            const searchTerm = event.target.value.toLowerCase();
            const filteredMovies = allMovies.filter(movie => {
                // Recherche insensible à la casse
                return movie.title.toLowerCase().includes(searchTerm);
            });
            displayMovies(filteredMovies); // Affiche les films filtrés
        });
    } else {
        console.warn('Le champ de recherche (#search-input) est manquant dans le HTML.');
    }

    // --- Fonction pour créer et ajouter un élément de film à la liste ---
    function createMovieItem(movie) {
        const movieItem = document.createElement('div');
        movieItem.classList.add('movie-item');

        const img = document.createElement('img');
        const defaultImageUrl = 'https://mikefri.github.io/Teslatv/image.jpg';
        img.src = movie.logo || defaultImageUrl;
        img.alt = movie.title;
        img.onerror = () => {
            img.src = defaultImageUrl; // Charge l'image par défaut en cas d'erreur
            console.warn(`Impossible de charger l'image pour: "${movie.title}" depuis "${movie.logo}". Affichage de l'image par défaut.`);
        };

        const titleP = document.createElement('p');
        titleP.textContent = movie.title;
        titleP.classList.add('movie-title');

        movieItem.appendChild(img);
        movieItem.appendChild(titleP);

        // Écouteur de clic pour lire le film
        movieItem.addEventListener('click', () => {
            const proxiedMovieUrl = `${proxyUrl}?url=${encodeURIComponent(movie.url)}`;
            console.log('Tentative de lecture via proxy:', proxiedMovieUrl);

            // 1. Arrêter toute lecture et détruire HLS.js si une instance existe
            if (videoPlayer.hlsInstance) {
                videoPlayer.hlsInstance.destroy();
                videoPlayer.hlsInstance = null;
                console.log('Ancienne instance HLS.js détruite.');
            }
            videoPlayer.src = ''; // Réinitialiser la source du lecteur HTML5 pour éviter les résidus

            // 2. Déterminer le type de fichier source original pour choisir le bon lecteur
            const fileExtension = movie.url.split('.').pop().toLowerCase();
            console.log(`Extension de fichier détectée: ${fileExtension}`);

            if (fileExtension === 'm3u8' && typeof Hls !== 'undefined' && Hls.isSupported()) {
                console.log('Format HLS (.m3u8) détecté, utilisation de HLS.js.');
                let hls = new Hls();
                hls.loadSource(proxiedMovieUrl);
                hls.attachMedia(videoPlayer);
                videoPlayer.hlsInstance = hls; // Stocke l'instance HLS.js sur l'élément vidéo

                hls.on(Hls.Events.ERROR, function (event, data) {
                    console.error('HLS.js Erreur:', data.details, data.fatal ? 'Erreur fatale!' : '');
                    if (data.fatal) {
                        // Tenter de récupérer ou informer l'utilisateur en cas d'erreur fatale HLS.js
                        switch(data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                console.error("Erreur réseau fatale HLS.js, tentative de récupération...");
                                hls.startLoad();
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                console.error("Erreur média fatale HLS.js, tentative de récupération...");
                                hls.recoverMediaError();
                                break;
                            default:
                                console.error("Erreur HLS.js irrécupérable, destruction de l'instance.");
                                hls.destroy();
                                videoPlayer.hlsInstance = null;
                                // Fallback optionnel: tenter la lecture native si l'erreur était un problème de format HLS inattendu
                                // videoPlayer.src = proxiedMovieUrl;
                                // videoPlayer.load();
                                break;
                        }
                    }
                });
            } else if (['mp4', 'mkv'].includes(fileExtension)) {
                // Formats souvent supportés nativement par les navigateurs modernes
                console.log(`Format natif (${fileExtension}) détecté, utilisation de la lecture HTML5.`);
                videoPlayer.src = proxiedMovieUrl;
            } else {
                // Autres formats (comme .avi) ou formats inconnus, tenter la lecture native
                console.warn(`Format de fichier (${fileExtension}) potentiellement non supporté nativement ou inconnu. Tentative de lecture HTML5.`);
                videoPlayer.src = proxiedMovieUrl;
                // Vous pouvez ajouter une alerte plus forte ici si .avi est très problématique
                // alert(`Attention: Le format ${fileExtension} peut ne pas être entièrement supporté par votre navigateur.`);
            }

            // 3. Charger la nouvelle source et tenter la lecture
            videoPlayer.load(); // Indispensable pour charger la nouvelle source
            videoPlayer.volume = 1; // S'assurer que le volume n'est pas à zéro
            videoPlayer.muted = false; // S'assurer que le son n'est pas coupé (peut être outrepassé par le navigateur)

            videoPlayer.play()
                .then(() => {
                    console.log('Lecture automatique de la vidéo réussie.');
                })
                .catch(playError => {
                    console.error('Erreur lors de la tentative de lecture automatique:', playError);
                    alert('La lecture automatique a été bloquée par le navigateur. Veuillez cliquer sur le bouton de lecture du lecteur vidéo.');
                });

            // Défilement vers le lecteur vidéo
            const videoPlayerContainer = document.getElementById('video-player-container');
            if (videoPlayerContainer) {
                window.scrollTo({ top: videoPlayerContainer.offsetTop, behavior: 'smooth' });
            } else {
                console.warn('Le conteneur du lecteur vidéo ("video-player-container") est introuvable. Le défilement ne sera pas effectué.');
            }
        });

        movieListDiv.appendChild(movieItem);
    }
});
