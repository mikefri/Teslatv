document.addEventListener('DOMContentLoaded', () => {
    // 1. Définition des constantes (URL, clés API, etc.)
    const m3uUrl = 'https://mikefri.github.io/Teslatv/xxx.m3u';
    const proxyUrl = 'https://proxy-tesla-tv.vercel.app/api';

    // --- CLÉS API ET URLS EXTERNES (POUR OMDb) ---
    const OMDB_API_KEY = 'bbcb253b'; // Votre clé API OMDb !
    const OMDB_BASE_URL = 'https://www.omdbapi.com/'; // Force HTTPS
    // --- FIN CLÉS API ET URLS EXTERNES ---

    // Références aux éléments DOM
    const movieListDiv = document.getElementById('movie-list');
    const videoPlayer = document.getElementById('video-player');
    const loadingMessage = document.getElementById('loading-message');
    const searchInput = document.getElementById('search-input');
    const genreSelect = document.getElementById('genre-select');

    // Stockage de tous les films chargés initialement
    let allMovies = [];
    // Pour stocker les genres uniques collectés de l'API OMDb
    const uniqueGenres = new Set(); 

    // --- Vérification des éléments DOM requis au démarrage ---
    if (!movieListDiv || !videoPlayer || !loadingMessage || !genreSelect) { 
        console.error('Erreur: Un ou plusieurs éléments DOM requis sont manquants. Assurez-vous que les IDs "movie-list", "video-player", "loading-message" et "genre-select" existent dans votre HTML.');
        loadingMessage.textContent = 'Erreur: Éléments de l\'interface utilisateur manquants. Veuillez vérifier votre HTML.';
        loadingMessage.style.color = 'red';
        return; // Arrête l'exécution si les éléments essentiels ne sont pas là
    }

    // --- Fonctions utilitaires ---

    /**
     * Nettoie une chaîne de caractères pour une meilleure correspondance avec les API de films.
     * Gère les préfixes, années entre parenthèses ou avec tiret, et mots-clés techniques.
     * @param {string} title Le titre original du film.
     * @returns {string} Le titre nettoyé.
     */
    function cleanMovieTitle(title) {
        let cleaned = title;
        // Supprime les préfixes courants et les espaces superflus (ex: "FR: # Film Title")
        cleaned = cleaned.replace(/^(FR:\s*|FR:|\s*#\s*)/i, '').trim();
        // Supprime les années entre parenthèses à la fin (ex: "Film Title (2019)")
        cleaned = cleaned.replace(/\s*\(\d{4}\)$/, '').trim();
        // Supprime les années précédées d'un tiret à la fin (ex: "Film Title - 2017")
        cleaned = cleaned.replace(/\s*-\s*\d{4}$/, '').trim(); 
        // Supprime tout ce qui se trouve après un tiret s'il y a un mot clé technique
        cleaned = cleaned.split(/ - (FHD|HD|VOSTFR|VF|MULTI|FR|SUB|2160P|1080P|720P|WEB-DL|BLURAY|DVDRIP|X264|XVID|AC3|DD5.1|DTS|TRUEFRENCH)\b/i)[0].trim();
        // Assure qu'il n'y a pas d'espaces multiples consécutifs et nettoie les espaces en début/fin
        cleaned = cleaned.replace(/\s+/g, ' ').trim();
        return cleaned;
    }

    /**
     * Récupère l'URL de l'affiche, la note et le genre d'un film depuis OMDb.
     * Cette fonction ne modifie pas directement 'movie' mais retourne les données.
     * @param {string} movieTitle Le titre du film à rechercher.
     * @returns {Promise<{posterUrl: string|null, rating: string|null, genre: string|null}>} L'URL de l'affiche, la note et le genre.
     */
    async function getMovieDataFromOmdb(movieTitle) {
        if (!OMDB_API_KEY) {
            console.warn("Clé API OMDb manquante ou non valide. Impossible de récupérer les affiches, notes et genres.");
            return { posterUrl: null, rating: null, genre: null };
        }

        const cleanedTitleForApi = cleanMovieTitle(movieTitle);

        if (!cleanedTitleForApi) {
            console.warn(`Titre de film vide après nettoyage pour OMDb API: "${movieTitle}"`);
            return { posterUrl: null, rating: null, genre: null };
        }

        const encodedCleanTitle = encodeURIComponent(cleanedTitleForApi);
        const searchUrl = `${OMDB_BASE_URL}?apikey=${OMDB_API_KEY}&t=${encodedCleanTitle}&type=movie`;
        console.log(`Requête OMDb pour: "${cleanedTitleForApi}" - URL: ${searchUrl}`);

        try {
            const response = await fetch(searchUrl);
            if (!response.ok) {
                console.error(`Erreur OMDb HTTP pour "${cleanedTitleForApi}": ${response.status} ${response.statusText}`);
                return { posterUrl: null, rating: null, genre: null };
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
                const imdbRating = data.Ratings.find(r => r.Source === "Internet Movie Database");
                if (imdbRating) {
                    rating = imdbRating.Value;
                } else if (data.imdbRating && data.imdbRating !== "N/A") {
                    rating = `${data.imdbRating}/10`;
                } else if (data.Ratings.length > 0) {
                    // Si IMDb n'est pas dispo, prend la première note valide trouvée
                    rating = data.Ratings[0].Value;
                }
            } else {
                console.warn(`Aucune note trouvée sur OMDb pour le film: "${cleanedTitleForApi}".`);
            }

            let genre = null;
            if (data.Response === "True" && data.Genre && data.Genre !== "N/A") {
                genre = data.Genre; // Ex: "Drama, Horror, Sci-Fi"
            }

            return { posterUrl: poster, rating: rating, genre: genre };

        } catch (error) {
            console.error(`Erreur réseau OMDb pour "${cleanedTitleForApi}": ${error.message || 'Unknown network error'}.`, error);
            return { posterUrl: null, rating: null, genre: null };
        }
    }

    /**
     * Crée et ajoute un élément de film au DOM.
     * Utilise les données du film déjà enrichies (posterUrl, rating, genre).
     * @param {object} movie L'objet film contenant titre, url, posterUrl, rating, et genre.
     */
    function createMovieItem(movie) {
        const movieItem = document.createElement('div');
        movieItem.classList.add('movie-item');

        const img = document.createElement('img');
        const defaultImageUrl = 'https://mikefri.github.io/Teslatv/image.jpg';
        img.alt = movie.title;
        img.src = movie.posterUrl || defaultImageUrl; // Utilise l'URL du poster déjà stockée sur l'objet movie
        img.onerror = () => { // Fallback si l'image OMDb ne se charge pas
            img.src = defaultImageUrl;
            console.warn(`Impossible de charger l'affiche OMDb pour "${movie.title}". Affichage de l'image par défaut.`);
        };

        const titleP = document.createElement('p');
        titleP.textContent = cleanMovieTitle(movie.title); // Affiche le titre nettoyé
        titleP.classList.add('movie-title');

        if (movie.rating) { // Utilise la note déjà stockée sur l'objet movie
            const ratingSpan = document.createElement('span');
            ratingSpan.classList.add('movie-rating');
            ratingSpan.textContent = movie.rating;
            movieItem.appendChild(ratingSpan);
        }

        movieItem.appendChild(img);
        movieItem.appendChild(titleP);

        // Écouteur de clic pour lire le film
        movieItem.addEventListener('click', () => {
            const proxiedMovieUrl = `${proxyUrl}?url=${encodeURIComponent(movie.url)}`;
            console.log('Tentative de lecture via proxy:', proxiedMovieUrl);

            // Arrêter toute lecture et détruire HLS.js si une instance existe
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
                            case Hls.ErrorTypes.NETWORK_ERROR: hls.startLoad(); break;
                            case Hls.ErrorTypes.MEDIA_ERROR: hls.recoverMediaError(); break;
                            default: hls.destroy(); videoPlayer.hlsInstance = null; break;
                        }
                    }
                });
            } else if (['mp4', 'mkv'].includes(fileExtension)) {
                videoPlayer.src = proxiedMovieUrl;
            } else {
                console.warn(`Format de fichier (${fileExtension}) potentiellement non supporté nativement ou inconnu. Tentative de lecture HTML5.`);
                videoPlayer.src = proxiedMovieUrl;
            }

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

    /**
     * Remplit le sélecteur de genres avec les genres uniques collectés.
     */
    function populateGenreSelect() {
        genreSelect.innerHTML = '<option value="all">Tous les genres</option>'; // Option par défaut

        // Convertir le Set en tableau, trier alphabétiquement
        const sortedGenres = Array.from(uniqueGenres).sort();

        sortedGenres.forEach(genre => {
            if (genre) { // Assurez-vous que le genre n'est pas vide (après trim() des split)
                const option = document.createElement('option');
                option.value = genre;
                option.textContent = genre;
                genreSelect.appendChild(option);
            }
        });
        // console.log("Genres uniques collectés et ajoutés au sélecteur :", uniqueGenres); // Pour débogage
        // console.log("Nombre d'options dans le sélecteur :", genreSelect.options.length); // Pour débogage
    }

    /**
     * Affiche une liste donnée de films dans le DOM.
     * @param {Array<object>} moviesToDisplay Liste des objets films à afficher.
     */
    function displayMovies(moviesToDisplay) {
        movieListDiv.innerHTML = ''; // Vide la liste actuelle
        if (moviesToDisplay.length === 0) {
            movieListDiv.innerHTML = '<p style="text-align: center; color: var(--neon-blue-light); margin-top: 20px; width: 100%;">Aucun film ne correspond à votre recherche ou filtre.</p>';
        }
        moviesToDisplay.forEach(movie => {
            createMovieItem(movie); // Crée et ajoute l'élément pour chaque film
        });
    }

    // --- Fin des fonctions utilitaires ---

    // --- Écouteurs d'événements vidéo (inchangés) ---
    videoPlayer.addEventListener('loadedmetadata', () => {
        console.log('--- Événement Vidéo: loadedmetadata ---');
        console.log(`Dimensions de la vidéo: ${videoPlayer.videoWidth}x${videoPlayer.videoHeight}`);
        console.log(`Durée de la vidéo: ${videoPlayer.duration} secondes`);
        if (videoPlayer.videoWidth === 0 && videoPlayer.videoHeight === 0) {
            console.warn('ATTENTION: Les dimensions de la vidéo sont 0x0. La vidéo pourrait ne pas être rendue ou décodée correctement.');
        }
    });

    videoPlayer.addEventListener('play', () => { console.log('--- Événement Vidéo: play --- La lecture a démarré ou a repris.'); });
    videoPlayer.addEventListener('playing', () => { console.log('--- Événement Vidéo: playing --- La vidéo est en cours de lecture.'); });
    videoPlayer.addEventListener('pause', () => { console.log('--- Événement Vidéo: pause --- La vidéo est en pause.'); });
    videoPlayer.addEventListener('ended', () => { console.log('--- Événement Vidéo: ended --- La vidéo est terminée.'); });
    videoPlayer.addEventListener('error', (event) => {
        console.error('--- Événement Vidéo: ERROR ---');
        const error = event.target.error;
        let errorMessage = 'Erreur vidéo inconnue.';
        switch (error.code) {
            case error.MEDIA_ERR_ABORTED: errorMessage = 'La lecture vidéo a été interrompue.'; break;
            case error.MEDIA_ERR_NETWORK: errorMessage = 'Une erreur réseau a empêché le téléchargement de la vidéo.'; break;
            case error.MEDIA_ERR_DECODE: errorMessage = 'Une erreur de décodage a empêché la lecture de la vidéo. Codec non supporté ?'; break;
            case error.MEDIA_ERR_SRC_NOT_SUPPORTED: errorMessage = 'Le format vidéo ou la source n\'est pas supportée par le navigateur.'; break;
            default: errorMessage = `Erreur vidéo inattendue (Code: ${error.code}).`; break;
        }
        console.error(`Message d'erreur vidéo: ${errorMessage} - Détails: ${error.message || 'Aucun message spécifique.'}`);
        alert(`Erreur de lecture vidéo: ${errorMessage}\nVeuillez consulter la console du navigateur pour plus de détails.`);
    });
    videoPlayer.addEventListener('stalled', () => { console.warn('--- Événement Vidéo: stalled --- Le téléchargement des données vidéo est interrompu.'); });
    videoPlayer.addEventListener('waiting', () => { console.log('--- Événement Vidéo: waiting --- Le lecteur attend des données pour continuer la lecture.'); });
    // --- Fin des écouteurs d'événements vidéo ---

    // --- Logique principale de chargement (fetch M3U et enrichissement OMDb) ---
    fetch(m3uUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erreur réseau lors du chargement du fichier M3U: ${response.status} ${response.statusText}`);
            }
            return response.text();
        })
        .then(async data => { // Rend cette fonction async pour pouvoir utiliser await
            loadingMessage.style.display = 'none';
            const lines = data.split('\n');
            let tempMovies = []; // Utilise un tableau temporaire pour les films parsés du M3U

            lines.forEach(line => {
                line = line.trim();
                if (line.startsWith('#EXTINF:')) {
                    const tvgNameMatch = line.match(/tvg-name="([^"]*)"/);
                    let rawTitle = tvgNameMatch ? tvgNameMatch[1] : 'Titre inconnu';
                    let cleanedTitleForStorage = rawTitle.replace(/^FR:#?\s*/i, '').trim(); 
                    
                    tempMovies.push({
                        title: cleanedTitleForStorage, 
                        url: ''
                    });
                } else if (line.startsWith('http')) {
                    if (tempMovies.length > 0) {
                        tempMovies[tempMovies.length - 1].url = line; // Associe l'URL au dernier film ajouté
                    }
                }
            });
            allMovies = tempMovies; // Affecte le tableau temporaire à allMovies

            // Crée un tableau de promesses pour chaque appel à getMovieDataFromOmdb
            const omdbPromises = allMovies.map(movie => getMovieDataFromOmdb(movie.title).then(omdbData => {
                // Une fois la promesse résolue, enrichit l'objet movie existant
                movie.posterUrl = omdbData.posterUrl;
                movie.rating = omdbData.rating;
                movie.genre = omdbData.genre;

                // Collecte les genres uniques ICI, après que le genre a été récupéré
                if (omdbData.genre) {
                    omdbData.genre.split(',').forEach(g => {
                        const trimmedGenre = g.trim();
                        if (trimmedGenre) uniqueGenres.add(trimmedGenre); // Assure que le genre n'est pas vide
                    });
                }
            }).catch(error => {
                // Gère les erreurs spécifiques à la promesse OMDb pour ce film (ne bloque pas Promise.allSettled)
                console.error(`Erreur lors de la récupération des données OMDb pour "${movie.title}":`, error);
                movie.posterUrl = null;
                movie.rating = null;
                movie.genre = null;
            }));

            // Attend que toutes les promesses OMDb soient terminées
            // allSettled permet de continuer même si certaines requêtes OMDb échouent
            await Promise.allSettled(omdbPromises);

            displayMovies(allMovies); // Affiche tous les films avec leurs données enrichies
            populateGenreSelect(); // Maintenant, les genres uniques sont bien collectés et le sélecteur peut être rempli
        })
        .catch(error => {
            console.error('Erreur lors du traitement du fichier M3U ou des données OMDb:', error);
            loadingMessage.style.display = 'block';
            loadingMessage.textContent = `Erreur lors du chargement des films: ${error.message}. Veuillez réessayer plus tard ou vérifier le fichier M3U.`;
            loadingMessage.style.color = 'red';
        });

    // --- Écouteur d'événement pour la recherche ---
    if (searchInput) {
        searchInput.addEventListener('input', (event) => {
            const searchTerm = event.target.value.toLowerCase();
            const filteredMovies = allMovies.filter(movie => {
                // Filtre par le titre nettoyé du film
                return cleanMovieTitle(movie.title).toLowerCase().includes(searchTerm);
            });
            displayMovies(filteredMovies);
        });
    } else {
        console.warn('Le champ de recherche (#search-input) est manquant dans le HTML.');
    }

    // --- Écouteur d'événement pour le changement de genre ---
    if (genreSelect) {
        genreSelect.addEventListener('change', (event) => {
            const selectedGenre = event.target.value;
            let moviesToDisplay = allMovies;

            if (selectedGenre !== 'all') {
                moviesToDisplay = allMovies.filter(movie => {
                    // Filtre les films si leur propriété 'genre' existe et contient le genre sélectionné
                    // movie.genre est une chaîne comme "Drama, Horror, Sci-Fi"
                    return movie.genre && movie.genre.split(',').map(g => g.trim()).includes(selectedGenre);
                });
            }
            displayMovies(moviesToDisplay);
        });
    } else {
        console.warn('Le sélecteur de genre (#genre-select) est manquant dans le HTML.');
    }
});