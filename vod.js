document.addEventListener('DOMContentLoaded', () => {
    // 1. Définition des constantes (URL, clés API, etc.)
    const m3uUrl = 'https://mikefri.github.io/Teslatv/vod.m3u';
    const proxyUrl = 'https://proxy-tesla-tv.vercel.app/api';

    // --- CLÉS API ET URLS EXTERNES (POUR OMDb) ---
    const OMDB_API_KEY = 'bbcb253b'; // Votre clé API OMDb !
    // Force l'utilisation de HTTPS pour OMDb pour éviter les problèmes de contenu mixte
    const OMDB_BASE_URL = 'https://www.omdbapi.com/';
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

    // --- Fonctions utilitaires (Définition de toutes les fonctions avant leur utilisation) ---

    /**
     * Nettoie une chaîne de caractères pour une meilleure correspondance avec les API de films.
     * @param {string} title Le titre original du film.
     * @returns {string} Le titre nettoyé.
     */
    function cleanMovieTitle(title) {
        let cleaned = title;
        // Supprime les préfixes courants et les espaces superflus
        // Ex: "FR: # Film Title (2020) - HD" -> "Film Title (2020) - HD"
        cleaned = cleaned.replace(/^(FR:\s*|FR:|\s*#\s*)/i, '').trim();
        // Supprime les années entre parenthèses à la fin (ex: "Film Title (2019)")
        cleaned = cleaned.replace(/\s*\(\d{4}\)$/, '').trim();
        // Supprime tout ce qui se trouve après un trait d'union si c'est un mot clé technique
        // Ex: "Film Title - Part 1 VOSTFR" -> "Film Title - Part 1"
        cleaned = cleaned.split(/ - (FHD|HD|VOSTFR|VF|MULTI|FR|SUB|2160P|1080P|720P)\b/i)[0].trim();
        // Gère le cas des numéros dans les titres comme "10 Cloverfield Lane" pour ne pas les enlever
        // S'assure que les caractères comme les deux-points sont acceptés par OMDb ou nettoyés si inutiles.
        // On ne fait pas trop de nettoyage ici, OMDb est relativement intelligent sur la ponctuation si le reste est bon.
        return cleaned;
    }

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

        const cleanedTitleForApi = cleanMovieTitle(movieTitle); // Applique le nettoyage

        if (!cleanedTitleForApi) {
            console.warn(`Titre de film vide après nettoyage pour OMDb API: "${movieTitle}"`);
            return null;
        }

        const encodedCleanTitle = encodeURIComponent(cleanedTitleForApi);
        const searchUrl = `${OMDB_BASE_URL}?apikey=${OMDB_API_KEY}&t=${encodedCleanTitle}&type=movie`;
        console.log(`Requête OMDb pour: "${cleanedTitleForApi}" - URL: ${searchUrl}`); // Pour débogage

        try {
            const response = await fetch(searchUrl);
            if (!response.ok) {
                console.error(`Erreur OMDb HTTP pour "${cleanedTitleForApi}": ${response.status} ${response.statusText}`);
                return null;
            }
            const data = await response.json();

            if (data.Response === "True" && data.Poster && data.Poster !== "N/A") {
                return data.Poster;
            }
            console.warn(`Aucune affiche trouvée sur OMDb pour le film: "${cleanedTitleForApi}" (OMDb Error: ${data.Error || 'Non trouvé'}).`);
            return null;
        } catch (error) {
            // C'est ici que le TypeError: Failed to fetch est capturé
            console.error(`Erreur réseau OMDb pour "${cleanedTitleForApi}": ${error.message || 'Unknown network error'}.`, error);
            return null;
        }
    }

    // Fonction pour créer et ajouter un élément de film à la liste
    function createMovieItem(movie) {
        const movieItem = document.createElement('div');
        movieItem.classList.add('movie-item');

        const img = document.createElement('img');
        const defaultImageUrl = 'https://mikefri.github.io/Teslatv/image.jpg'; // Votre image par défaut
        img.alt = movie.title;

        // Appel asynchrone pour la jaquette
        getMoviePosterUrl(movie.title) // On passe le titre original, le nettoyage se fait dans getMoviePosterUrl
            .then(posterUrl => {
                img.src = posterUrl || defaultImageUrl;
                img.onerror = () => { // Fallback si l'image OMDb ne se charge pas
                    img.src = defaultImageUrl;
                    console.warn(`Impossible de charger l'affiche OMDb pour "${movie.title}". Affichage de l'image par défaut.`);
                };
            })
            .catch(error => {
                console.error(`Erreur lors de la récupération de l'affiche pour "${movie.title}":`, error);
                img.src = defaultImageUrl;
            });

        const titleP = document.createElement('p');
        // Affiche le titre après un nettoyage minimal pour l'affichage à l'utilisateur
        titleP.textContent = cleanMovieTitle(movie.title);
        titleP.classList.add('movie-title');

        movieItem.appendChild(img);
        movieItem.appendChild(titleP);

        // Écouteur de clic pour lire le film (pas de changement ici)
        movieItem.addEventListener('click', () => {
            const proxiedMovieUrl = `${proxyUrl}?url=${encodeURIComponent(movie.url)}`;
            console.log('Tentative de lecture via proxy:', proxiedMovieUrl);

            // 1. Arrêter toute lecture et détruire HLS.js si une instance existe
            if (videoPlayer.hlsInstance) {
                videoPlayer.hlsInstance.destroy();
                videoPlayer.hlsInstance = null;
                console.log('Ancienne instance HLS.js détruite.');
            }
            videoPlayer.src = '';

            // 2. Déterminer le type de fichier source original
            const fileExtension = movie.url.split('.').pop().toLowerCase();
            console.log(`Extension de fichier détectée: ${fileExtension}`);

            if (fileExtension === 'm3u8' && typeof Hls !== 'undefined' && Hls.isSupported()) {
                console.log('Format HLS (.m3u8) détecté, utilisation de HLS.js.');
                let hls = new Hls();
                hls.loadSource(proxiedMovieUrl);
                hls.attachMedia(videoPlayer);
                videoPlayer.hlsInstance = hls;

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

    // --- Fin des fonctions utilitaires ---

    // --- Écouteurs d'événements vidéo (pas de changement ici) ---
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

    // --- Logique principale de chargement (fetch M3U) ---
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
                    let rawTitle = tvgNameMatch ? tvgNameMatch[1] : 'Titre inconnu';

                    // Nettoyage initial du titre pour le stockage dans allMovies
                    let cleanedTitleForStorage = rawTitle.replace(/^FR:#?\s*/i, '').trim(); 
                    
                    currentMovie = {
                        title: cleanedTitleForStorage, // Ce titre est stocké et sera utilisé pour l'affichage et la recherche OMDb
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
            displayMovies(allMovies); // L'appel est maintenant sûr car displayMovies est défini plus haut
        })
        .catch(error => {
            console.error('Erreur lors du traitement du fichier M3U:', error);
            loadingMessage.style.display = 'block';
            loadingMessage.textContent = `Erreur lors du chargement des films: ${error.message}. Veuillez réessayer plus tard ou vérifier le fichier M3U.`;
            loadingMessage.style.color = 'red';
        });

    // --- Écouteur d'événement pour la recherche ---
    if (searchInput) {
        searchInput.addEventListener('input', (event) => {
            const searchTerm = event.target.value.toLowerCase();
            const filteredMovies = allMovies.filter(movie => {
                // Utiliser le titre nettoyé pour la recherche interne
                return cleanMovieTitle(movie.title).toLowerCase().includes(searchTerm);
            });
            displayMovies(filteredMovies);
        });
    } else {
        console.warn('Le champ de recherche (#search-input) est manquant dans le HTML.');
    }
});