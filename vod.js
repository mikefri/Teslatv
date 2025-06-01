document.addEventListener('DOMContentLoaded', () => {
    // 1. Définition des constantes (URL, clés API, etc.)
    const m3uUrl = 'https://mikefri.github.io/Teslatv/vod.m3u';
    const proxyUrl = 'https://proxy-tesla-tv.vercel.app/api';

    // --- CLÉS API ET URLS EXTERNES (POUR OMDb) ---
    const OMDB_API_KEY = 'bbcb253b';
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

    function cleanMovieTitle(title) {
        let cleaned = title;
        cleaned = cleaned.replace(/^(FR:\s*|FR:|\s*#\s*)/i, '').trim();
        cleaned = cleaned.replace(/\s*\(\d{4}\)$/, '').trim();
        cleaned = cleaned.replace(/\s*-\s*\d{4}$/, '').trim();
        cleaned = cleaned.split(/ - (FHD|HD|VOSTFR|VF|MULTI|FR|SUB|2160P|1080P|720P|WEB-DL|BLURAY|DVDRIP|X264|XVID|AC3|DD5.1|DTS|TRUEFRENCH)\b/i)[0].trim();
        cleaned = cleaned.replace(/\s+/g, ' ').trim();
        return cleaned;
    }

    /**
     * Récupère l'URL de l'affiche et la note d'un film depuis OMDb.
     * @param {string} movieTitle Le titre du film à rechercher.
     * @returns {Promise<{posterUrl: string|null, rating: string|null}>} L'URL de l'affiche et la note, ou null pour les deux.
     */
    async function getMoviePosterUrl(movieTitle) {
        if (!OMDB_API_KEY) {
            console.warn("Clé API OMDb manquante ou non valide. Impossible de récupérer les affiches et notes.");
            return { posterUrl: null, rating: null };
        }

        const cleanedTitleForApi = cleanMovieTitle(movieTitle);

        if (!cleanedTitleForApi) {
            console.warn(`Titre de film vide après nettoyage pour OMDb API: "${movieTitle}"`);
            return { posterUrl: null, rating: null };
        }

        const encodedCleanTitle = encodeURIComponent(cleanedTitleForApi);
        const searchUrl = `${OMDB_BASE_URL}?apikey=${OMDB_API_KEY}&t=${encodedCleanTitle}&type=movie`;
        console.log(`Requête OMDb pour: "${cleanedTitleForApi}" - URL: ${searchUrl}`);

        try {
            const response = await fetch(searchUrl);
            if (!response.ok) {
                console.error(`Erreur OMDb HTTP pour "${cleanedTitleForApi}": ${response.status} ${response.statusText}`);
                return { posterUrl: null, rating: null };
            }
            const data = await response.json();

            let poster = null;
            if (data.Response === "True" && data.Poster && data.Poster !== "N/A") {
                poster = data.Poster;
            } else {
                console.warn(`Aucune affiche trouvée sur OMDb pour le film: "${cleanedTitleForApi}" (OMDb Error: ${data.Error || 'Non trouvé'}).`);
            }

            let rating = null;
            if (data.Response === "True" && data.Ratings && data.Ratings.length > 0) {
                // Cherche d'abord la note IMDb
                const imdbRating = data.Ratings.find(r => r.Source === "Internet Movie Database");
                if (imdbRating) {
                    rating = imdbRating.Value;
                } else if (data.imdbRating && data.imdbRating !== "N/A") {
                    // Fallback sur imdbRating direct si Ratings n'est pas idéal ou si IMDb est plus direct
                    rating = `${data.imdbRating}/10`; // OMDb donne souvent juste le chiffre, ajoutons "/10"
                } else if (data.Ratings.length > 0) {
                    // Si IMDb n'est pas dispo, prend la première note valide
                    rating = data.Ratings[0].Value;
                }
            } else {
                console.warn(`Aucune note trouvée sur OMDb pour le film: "${cleanedTitleForApi}".`);
            }

            return { posterUrl: poster, rating: rating };

        } catch (error) {
            console.error(`Erreur réseau OMDb pour "${cleanedTitleForApi}": ${error.message || 'Unknown network error'}.`, error);
            return { posterUrl: null, rating: null };
        }
    }

    // Fonction pour créer et ajouter un élément de film à la liste
    function createMovieItem(movie) {
        const movieItem = document.createElement('div');
        movieItem.classList.add('movie-item'); // Ajoute la classe pour le style CSS

        const img = document.createElement('img');
        const defaultImageUrl = 'https://mikefri.github.io/Teslatv/image.jpg';
        img.alt = movie.title;

        const titleP = document.createElement('p');
        titleP.textContent = cleanMovieTitle(movie.title);
        titleP.classList.add('movie-title');

        // Créer l'élément pour la note
        const ratingSpan = document.createElement('span');
        ratingSpan.classList.add('movie-rating'); // Classe pour le style

        // Appel asynchrone pour la jaquette et la note
        getMoviePosterUrl(movie.title)
            .then(({ posterUrl, rating }) => {
                img.src = posterUrl || defaultImageUrl;
                img.onerror = () => {
                    img.src = defaultImageUrl;
                    console.warn(`Impossible de charger l'affiche OMDb pour "${movie.title}". Affichage de l'image par défaut.`);
                };

                if (rating) {
                    ratingSpan.textContent = rating;
                    movieItem.appendChild(ratingSpan); // Ajoute la note à l'élément du film
                }
            })
            .catch(error => {
                console.error(`Erreur lors de la récupération de l'affiche/note pour "${movie.title}":`, error);
                img.src = defaultImageUrl;
            });

        movieItem.appendChild(img);
        movieItem.appendChild(titleP);

        // Écouteur de clic pour lire le film (inchangé)
        movieItem.addEventListener('click', () => {
            const proxiedMovieUrl = `${proxyUrl}?url=${encodeURIComponent(movie.url)}`;
            console.log('Tentative de lecture via proxy:', proxiedMovieUrl);

            if (videoPlayer.hlsInstance) {
                videoPlayer.hlsInstance.destroy();
                videoPlayer.hlsInstance = null;
            }
            videoPlayer.src = '';

            const fileExtension = movie.url.split('.').pop().toLowerCase();

            if (fileExtension === 'm3u8' && typeof Hls !== 'undefined' && Hls.isSupported()) {
                let hls = new Hls();
                hls.loadSource(proxiedMovieUrl);
                hls.attachMedia(videoPlayer);
                videoPlayer.hlsInstance = hls;

                hls.on(Hls.Events.ERROR, function (event, data) {
                    console.error('HLS.js Erreur:', data.details, data.fatal ? 'Erreur fatale!' : '');
                    if (data.fatal) {
                        switch(data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                hls.startLoad();
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                hls.recoverMediaError();
                                break;
                            default:
                                hls.destroy();
                                videoPlayer.hlsInstance = null;
                                break;
                        }
                    }
                });
            } else if (['mp4', 'mkv'].includes(fileExtension)) {
                videoPlayer.src = proxiedMovieUrl;
            } else {
                console.warn(`Format de fichier (${fileExtension}) potentiellement non supporté.`);
                videoPlayer.src = proxiedMovieUrl;
            }

            videoPlayer.load();
            videoPlayer.volume = 1;
            videoPlayer.muted = false;

            videoPlayer.play()
                .then(() => {})
                .catch(playError => {
                    alert('La lecture automatique a été bloquée. Veuillez cliquer sur le bouton de lecture.');
                });

            const videoPlayerContainer = document.getElementById('video-player-container');
            if (videoPlayerContainer) {
                window.scrollTo({ top: videoPlayerContainer.offsetTop, behavior: 'smooth' });
            }
        });

        movieListDiv.appendChild(movieItem);
    }

    // Fonction pour afficher une liste donnée de films (inchangé)
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

    // --- Écouteurs d'événements vidéo (inchangé) ---
    videoPlayer.addEventListener('loadedmetadata', () => { /* ... */ });
    videoPlayer.addEventListener('play', () => { /* ... */ });
    videoPlayer.addEventListener('playing', () => { /* ... */ });
    videoPlayer.addEventListener('pause', () => { /* ... */ });
    videoPlayer.addEventListener('ended', () => { /* ... */ });
    videoPlayer.addEventListener('error', (event) => { /* ... */ });
    videoPlayer.addEventListener('stalled', () => { /* ... */ });
    videoPlayer.addEventListener('waiting', () => { /* ... */ });
    // --- Fin des écouteurs d'événements vidéo ---

    // --- Logique principale de chargement (fetch M3U) (inchangé) ---
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
                    let cleanedTitleForStorage = rawTitle.replace(/^FR:#?\s*/i, '').trim(); 
                    currentMovie = {
                        title: cleanedTitleForStorage, 
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
            displayMovies(allMovies);
        })
        .catch(error => {
            console.error('Erreur lors du traitement du fichier M3U:', error);
            loadingMessage.style.display = 'block';
            loadingMessage.textContent = `Erreur lors du chargement des films: ${error.message}. Veuillez réessayer plus tard ou vérifier le fichier M3U.`;
            loadingMessage.style.color = 'red';
        });

    // --- Écouteur d'événement pour la recherche (inchangé) ---
    if (searchInput) {
        searchInput.addEventListener('input', (event) => {
            const searchTerm = event.target.value.toLowerCase();
            const filteredMovies = allMovies.filter(movie => {
                return cleanMovieTitle(movie.title).toLowerCase().includes(searchTerm);
            });
            displayMovies(filteredMovies);
        });
    } else {
        console.warn('Le champ de recherche (#search-input) est manquant dans le HTML.');
    }
});