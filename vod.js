document.addEventListener('DOMContentLoaded', () => {
    // URL de votre fichier M3U et de votre proxy Vercel
    const m3uUrl = 'https://mikefri.github.io/Teslatv/vod.m3u';
    const proxyUrl = 'https://proxy-tesla-tv.vercel.app/api';

    // --- CLÉS API ET URLS EXTERNES (POUR OMDb) ---
    const OMDB_API_KEY = 'bbcb253b'; // <<< Votre clé API OMDb !
    // OMDb ne nécessite pas de base URL d'image distincte, l'URL de l'affiche est directe dans la réponse.
    // --- FIN CLÉS API ET URLS EXTERNES ---

    // Références aux éléments DOM
    const movieListDiv = document.getElementById('movie-list');
    const videoPlayer = document.getElementById('video-player');
    const loadingMessage = document.getElementById('loading-message');
    const searchInput = document.getElementById('search-input');

    // Stockage de tous les films chargés initialement
    let allMovies = [];

    // --- Vérification des éléments DOM requis au démarrage ---
    if (!movieListDiv || !videoPlayer || !loadingMessage) {
        console.error('Erreur: Un ou plusieurs éléments DOM requis sont manquants. Assurez-vous que les IDs "movie-list", "video-player" et "loading-message" existent dans votre HTML.');
        loadingMessage.textContent = 'Erreur: Éléments de l\'interface utilisateur manquants. Veuillez vérifier votre HTML.';
        loadingMessage.style.color = 'red';
        return;
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
        const error = event.target.error;
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

    // --- Fonctions de création et d'affichage des films ---

    /**
     * Récupère l'URL de l'affiche d'un film depuis OMDb en utilisant son titre.
     * @param {string} movieTitle Le titre du film à rechercher.
     * @returns {Promise<string|null>} L'URL de l'affiche ou null si non trouvée/erreur.
     */
    async function getMoviePosterUrl(movieTitle) {
        if (!OMDB_API_KEY) {
            console.warn("Clé API OMDb manquante ou non valide. Impossible de récupérer les affiches.");
            return null;
        }

        const encodedTitle = encodeURIComponent(movieTitle);
        // OMDb utilise 't=' pour la recherche par titre exact, 's=' pour une recherche plus large.
        // On utilise 't=' car c'est plus précis pour les jaquettes individuelles.
        // 'type=movie' pour s'assurer qu'on cherche un film et non une série.
        const searchUrl = `http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${encodedTitle}&type=movie`;

        try {
            const response = await fetch(searchUrl);
            if (!response.ok) {
                console.error(`Erreur OMDb lors de la recherche pour "${movieTitle}": ${response.status} ${response.statusText}`);
                return null;
            }
            const data = await response.json();

            // OMDb renvoie "Response": "True" si un résultat est trouvé
            if (data.Response === "True" && data.Poster && data.Poster !== "N/A") {
                // 'N/A' signifie "Non Applicable" pour l'affiche
                return data.Poster; // OMDb retourne directement l'URL complète de l'affiche
            }
            console.warn(`Aucune affiche trouvée sur OMDb pour le film: "${movieTitle}"`);
            return null; // Aucune affiche trouvée ou le film n'est pas dans la base de données
        } catch (error) {
            console.error(`Erreur lors de la requête OMDb pour "${movieTitle}":`, error);
            return null;
        }
    }

    // Fonction pour créer et ajouter un élément de film à la liste
    function createMovieItem(movie) {
        const movieItem = document.createElement('div');
        movieItem.classList.add('movie-item');

        const img = document.createElement('img');
        const defaultImageUrl = 'https://mikefri.github.io/Teslatv/image.jpg'; // Votre image par défaut existante
        img.alt = movie.title;

        // Utilisation de la nouvelle fonction pour obtenir l'affiche de OMDb
        getMoviePosterUrl(movie.title)
            .then(posterUrl => {
                img.src = posterUrl || defaultImageUrl; // Utilise l'affiche OMDb ou l'image par défaut
                img.onerror = () => { // Fallback si l'image OMDb ne se charge pas
                    img.src = defaultImageUrl;
                    console.warn(`Impossible de charger l'affiche OMDb pour "${movie.title}". Affichage de l'image par défaut.`);
                };
            })
            .catch(error => {
                console.error(`Erreur lors de la récupération de l'affiche pour "${movie.title}":`, error);
                img.src = defaultImageUrl; // En cas d'erreur de la requête API, utilisez l'image par défaut
            });


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
                                break;
                        }
                    }
                });
            } else if (['mp4', 'mkv'].includes(fileExtension)) {
                console.log(`Format natif (${fileExtension}) détecté, utilisation de la lecture HTML5.`);
                videoPlayer.src = proxiedMovieUrl;
            } else {
                console.warn(`Format de fichier (${fileExtension}) potentiellement non supporté nativement ou inconnu. Tentative de lecture HTML5.`);
                videoPlayer.src = proxiedMovieUrl;
            }

            // 3. Charger la nouvelle source et tenter la lecture
            videoPlayer.load();
            videoPlayer.volume = 1;
            videoPlayer.muted = false;

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

    // Fonction pour afficher une liste donnée de films
    function displayMovies(moviesToDisplay) {
        movieListDiv.innerHTML = '';
        if (moviesToDisplay.length === 0) {
            movieListDiv.innerHTML = '<p style="text-align: center; color: var(--neon-blue-light); margin-top: 20px; width: 100%;">Aucun film ne correspond à votre recherche.</p>';
        }
        moviesToDisplay.forEach(movie => {
            createMovieItem(movie);
        });
    }

    // --- Fin des fonctions de création et d'affichage des films ---

    // --- Fonction pour charger et parser le fichier M3U ---
    fetch(m3uUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erreur réseau lors du chargement du fichier M3U: ${response.status} ${response.statusText}`);
            }
            return response.text();
        })
        .then(data => {
            loadingMessage.style.display = 'none';
            const lines = data.split('\n');
            let currentMovie = {};

            lines.forEach(line => {
                line = line.trim();
                if (line.startsWith('#EXTINF:')) {
                    const tvgNameMatch = line.match(/tvg-name="([^"]*)"/);
                    // const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/); // Cette ligne peut être commentée, car on n'utilise plus le logo du M3U

                    let rawTitle = tvgNameMatch ? tvgNameMatch[1] : 'Titre inconnu';

                    // Nettoyage du titre (pour l'affichage et la recherche OMDb)
                    let cleanedTitle = rawTitle.replace(/^FR:#?\s*/i, '').trim(); 

                    currentMovie = {
                        title: cleanedTitle,
                        url: ''
                    };
                } else if (line.startsWith('http')) {
                    if (currentMovie.title) {
                        currentMovie.url = line;
                        allMovies.push(currentMovie);
                        currentMovie = {};
                    }
                }
            });

            // Affiche tous les films au premier chargement
            displayMovies(allMovies);
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
                return movie.title.toLowerCase().includes(searchTerm);
            });
            displayMovies(filteredMovies); // Redisplay filtered movies with their fetched posters
        });
    } else {
        console.warn('Le champ de recherche (#search-input) est manquant dans le HTML.');
    }
});