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
    // NOUVEAU: Référence au sélecteur de genre
    const genreSelect = document.getElementById('genre-select'); 


    // Stockage de tous les films chargés initialement
    let allMovies = [];
    // NOUVEAU: Pour stocker les genres uniques
    const uniqueGenres = new Set(); 

    // --- Vérification des éléments DOM requis au démarrage ---
    // NOUVEAU: Ajout de genreSelect à la vérification
    if (!movieListDiv || !videoPlayer || !loadingMessage || !genreSelect) { 
        console.error('Erreur: Un ou plusieurs éléments DOM requis sont manquants. Assurez-vous que les IDs "movie-list", "video-player", "loading-message" et "genre-select" existent dans votre HTML.');
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
     * Récupère l'URL de l'affiche, la note et le genre d'un film depuis OMDb.
     * @param {string} movieTitle Le titre du film à rechercher.
     * @returns {Promise<{posterUrl: string|null, rating: string|null, genre: string|null}>} L'URL de l'affiche, la note et le genre, ou null pour les trois.
     */
    async function getMovieDataFromOmdb(movieTitle) { // Renommée pour mieux refléter son rôle
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
                    rating = data.Ratings[0].Value;
                }
            } else {
                console.warn(`Aucune note trouvée sur OMDb pour le film: "${cleanedTitleForApi}".`);
            }

            // NOUVEAU: Récupérer le genre
            let genre = null;
            if (data.Response === "True" && data.Genre && data.Genre !== "N/A") {
                genre = data.Genre; // Les genres sont une chaîne comme "Drama, Horror, Sci-Fi"
            }

            return { posterUrl: poster, rating: rating, genre: genre };

        } catch (error) {
            console.error(`Erreur réseau OMDb pour "${cleanedTitleForApi}": ${error.message || 'Unknown network error'}.`, error);
            return { posterUrl: null, rating: null, genre: null };
        }
    }

    // Fonction pour créer et ajouter un élément de film à la liste
    function createMovieItem(movie) {
        const movieItem = document.createElement('div');
        movieItem.classList.add('movie-item');

        const img = document.createElement('img');
        const defaultImageUrl = 'https://mikefri.github.io/Teslatv/image.jpg';
        img.alt = movie.title;

        const titleP = document.createElement('p');
        titleP.textContent = cleanMovieTitle(movie.title);
        titleP.classList.add('movie-title');

        const ratingSpan = document.createElement('span');
        ratingSpan.classList.add('movie-rating');

        // NOUVEAU: Afficher le genre (à des fins de débogage ou si vous voulez l'afficher)
        // Vous pouvez ne pas l'afficher si vous ne voulez qu'un filtre
        // const genreP = document.createElement('p');
        // genreP.classList.add('movie-genre');


        // Appel asynchrone pour la jaquette, la note ET le genre
        getMovieDataFromOmdb(movie.title)
            .then(({ posterUrl, rating, genre }) => { // Récupère le genre aussi
                img.src = posterUrl || defaultImageUrl;
                img.onerror = () => {
                    img.src = defaultImageUrl;
                    console.warn(`Impossible de charger l'affiche OMDb pour "${movie.title}". Affichage de l'image par défaut.`);
                };

                if (rating) {
                    ratingSpan.textContent = rating;
                    movieItem.appendChild(ratingSpan);
                }

                // NOUVEAU: Stocke le genre avec le film pour le filtrage
                movie.genre = genre; // Ajoute la propriété 'genre' à l'objet film existant

                // NOUVEAU: Collecte les genres uniques pour le sélecteur
                if (genre) {
                    genre.split(',').forEach(g => {
                        uniqueGenres.add(g.trim());
                    });
                }
            })
            .catch(error => {
                console.error(`Erreur lors de la récupération des données OMDb pour "${movie.title}":`, error);
                img.src = defaultImageUrl;
                movie.genre = null; // Assurez-vous que le genre est null en cas d'erreur
            });

        movieItem.appendChild(img);
        movieItem.appendChild(titleP);
        // if (genreP) movieItem.appendChild(genreP); // Si vous voulez afficher le genre sous le titre

        // Écouteur de clic pour lire le film (inchangé)
        movieItem.addEventListener('click', () => { /* ... code inchangé ... */ });

        movieListDiv.appendChild(movieItem);
    }

    // NOUVEAU: Fonction pour peupler le sélecteur de genres
    function populateGenreSelect() {
        genreSelect.innerHTML = '<option value="all">Tous les genres</option>'; // Option par défaut

        // Convertir le Set en tableau, trier alphabétiquement
        const sortedGenres = Array.from(uniqueGenres).sort();

        sortedGenres.forEach(genre => {
            if (genre) { // Assurez-vous que le genre n'est pas vide
                const option = document.createElement('option');
                option.value = genre;
                option.textContent = genre;
                genreSelect.appendChild(option);
            }
        });
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
            // NOUVEAU: Peupler le sélecteur de genres après l'affichage initial des films
            populateGenreSelect(); 
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

    // NOUVEAU: Écouteur d'événement pour le changement de genre
    if (genreSelect) {
        genreSelect.addEventListener('change', (event) => {
            const selectedGenre = event.target.value;
            let moviesToDisplay = allMovies;

            if (selectedGenre !== 'all') {
                moviesToDisplay = allMovies.filter(movie => {
                    // Si le film a un genre et que le genre sélectionné est inclus dans ses genres (chaîne "Drama, Horror")
                    return movie.genre && movie.genre.split(',').map(g => g.trim()).includes(selectedGenre);
                });
            }
            displayMovies(moviesToDisplay);
        });
    } else {
        console.warn('Le sélecteur de genre (#genre-select) est manquant dans le HTML.');
    }
});