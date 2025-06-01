document.addEventListener('DOMContentLoaded', () => {
    // 1. Définition des constantes (URL, clés API, etc.)
    const m3uUrl = 'https://mikefri.github.io/Teslatv/vod.m3u';
    const proxyUrl = 'https://proxy-tesla-tv.vercel.app/api';
    const OMDB_API_KEY = 'bbcb253b'; // Votre clé OMDb
    const defaultImageUrl = 'https://mikefri.github.io/Teslatv/image.jpg';

    // 2. Références aux éléments DOM
    const movieListDiv = document.getElementById('movie-list');
    const videoPlayer = document.getElementById('video-player');
    const loadingMessage = document.getElementById('loading-message');
    const searchInput = document.getElementById('search-input');

    // 3. Variables d'état (ex: allMovies)
    let allMovies = [];

    // 4. Vérifications DOM initiales
    if (!movieListDiv || !videoPlayer || !loadingMessage) {
        console.error('Erreur: Un ou plusieurs éléments DOM requis sont manquants.');
        loadingMessage.textContent = 'Erreur: Éléments de l\'interface utilisateur manquants.';
        loadingMessage.style.color = 'red';
        return;
    }

    // 5. Fonctions utilitaires (getMoviePosterUrl, createMovieItem, displayMovies)
    //    C'est ici que getMoviePosterUrl, createMovieItem et displayMovies DOIVENT être définies.

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
        const searchUrl = `http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${encodedTitle}&type=movie`;

        try {
            const response = await fetch(searchUrl);
            if (!response.ok) {
                // Gérer les erreurs HTTP (4xx, 5xx)
                console.error(`Erreur OMDb lors de la recherche pour "${movieTitle}": ${response.status} ${response.statusText}`);
                return null;
            }
            const data = await response.json();

            if (data.Response === "True" && data.Poster && data.Poster !== "N/A") {
                return data.Poster;
            }
            console.warn(`Aucune affiche trouvée sur OMDb pour le film: "${movieTitle}"`);
            return null;
        } catch (error) {
            // Gérer les erreurs réseau (Failed to fetch)
            console.error(`Erreur réseau OMDb pour "${movieTitle}":`, error);
            // Si c'est un 'Failed to fetch', c'est ici qu'on le capte.
            return null;
        }
    }

    // Fonction pour créer et ajouter un élément de film à la liste
    function createMovieItem(movie) {
        const movieItem = document.createElement('div');
        movieItem.classList.add('movie-item');

        const img = document.createElement('img');
        img.alt = movie.title;

        // Appel asynchrone pour la jaquette
        getMoviePosterUrl(movie.title)
            .then(posterUrl => {
                img.src = posterUrl || defaultImageUrl;
                img.onerror = () => {
                    img.src = defaultImageUrl;
                    console.warn(`Impossible de charger l'affiche OMDb pour "${movie.title}". Affichage de l'image par défaut.`);
                };
            })
            .catch(error => {
                console.error(`Erreur lors de la récupération de l'affiche pour "${movie.title}":`, error);
                img.src = defaultImageUrl;
            });

        const titleP = document.createElement('p');
        titleP.textContent = movie.title;
        titleP.classList.add('movie-title');

        movieItem.appendChild(img);
        movieItem.appendChild(titleP);

        // Écouteur de clic pour lire le film (reste inchangé)
        movieItem.addEventListener('click', () => {
            const proxiedMovieUrl = `${proxyUrl}?url=${encodeURIComponent(movie.url)}`;
            console.log('Tentative de lecture via proxy:', proxiedMovieUrl);

            if (videoPlayer.hlsInstance) {
                videoPlayer.hlsInstance.destroy();
                videoPlayer.hlsInstance = null;
                console.log('Ancienne instance HLS.js détruite.');
            }
            videoPlayer.src = '';

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

    // 6. Écouteurs d'événements vidéo (comme vous les aviez)
    videoPlayer.addEventListener('loadedmetadata', () => { /* ... */ });
    videoPlayer.addEventListener('play', () => { /* ... */ });
    videoPlayer.addEventListener('error', (event) => { /* ... */ });
    // ... et les autres ...

    // 7. Logique principale de chargement (fetch M3U)
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
            displayMovies(allMovies); // L'appel est maintenant sûr ici
        })
        .catch(error => {
            console.error('Erreur lors du traitement du fichier M3U:', error);
            loadingMessage.style.display = 'block';
            loadingMessage.textContent = `Erreur lors du chargement des films: ${error.message}. Veuillez réessayer plus tard ou vérifier le fichier M3U.`;
            loadingMessage.style.color = 'red';
        });

    // 8. Écouteur d'événement pour la recherche
    if (searchInput) {
        searchInput.addEventListener('input', (event) => {
            const searchTerm = event.target.value.toLowerCase();
            const filteredMovies = allMovies.filter(movie => {
                return movie.title.toLowerCase().includes(searchTerm);
            });
            displayMovies(filteredMovies);
        });
    } else {
        console.warn('Le champ de recherche (#search-input) est manquant dans le HTML.');
    }
});