document.addEventListener('DOMContentLoaded', () => {
    const m3uUrl = 'https://mikefri.github.io/Teslatv/vod.m3u';
    const proxyUrl = 'https://proxy-tesla-tv.vercel.app/api';
    const movieListDiv = document.getElementById('movie-list');
    const videoPlayer = document.getElementById('video-player');
    const loadingMessage = document.getElementById('loading-message');

    if (!movieListDiv || !videoPlayer || !loadingMessage) {
        console.error('Un ou plusieurs éléments DOM requis sont manquants. Assurez-vous que les IDs "movie-list", "video-player" et "loading-message" existent dans votre HTML.');
        loadingMessage.textContent = 'Erreur: Éléments de l\'interface utilisateur manquants.';
        loadingMessage.style.color = 'red';
        return;
    }

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
                    const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/);
                    const title = tvgNameMatch ? tvgNameMatch[1] : 'Titre inconnu';
                    const logo = tvgLogoMatch ? tvgLogoMatch[1] : '';

                    currentMovie = {
                        title: title,
                        logo: logo,
                        url: ''
                    };
                } else if (line.startsWith('http')) {
                    if (currentMovie.title) {
                        currentMovie.url = line;
                        displayMovie(currentMovie);
                        currentMovie = {};
                    }
                }
            });

            if (movieListDiv.children.length === 0) {
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

    function displayMovie(movie) {
        const movieItem = document.createElement('div');
        movieItem.classList.add('movie-item');

        const img = document.createElement('img');
        img.src = movie.logo || 'https://via.placeholder.com/180x270?text=Pas+d%27image';
        img.alt = movie.title;
        img.onerror = () => {
            img.src = 'https://via.placeholder.com/180x270?text=Image+non+disponible';
            console.warn(`Impossible de charger l'image pour: ${movie.title} depuis ${movie.logo}`);
        };

        const titleP = document.createElement('p');
        titleP.textContent = movie.title;
        titleP.classList.add('movie-title');

        movieItem.appendChild(img);
        movieItem.appendChild(titleP);

        // --- C'est CETTE PARTIE QUI GÈRE LA LECTURE AU CLIC ---
        movieItem.addEventListener('click', () => {
            const proxiedMovieUrl = `${proxyUrl}?url=${encodeURIComponent(movie.url)}`;
            console.log('Lecture via proxy:', proxiedMovieUrl);

            videoPlayer.src = proxiedMovieUrl;
            videoPlayer.load(); // Charge la vidéo
            videoPlayer.muted = false; // Important : assurez-vous que la vidéo n'est PAS muette au clic
            videoPlayer.play() // Tente de démarrer la lecture
                .catch(playError => {
                    console.error('Erreur lors de la lecture de la vidéo:', playError);
                    alert('Impossible de lire la vidéo automatiquement. Veuillez cliquer sur le bouton de lecture.');
                });

            // Défilement fluide vers le lecteur vidéo
            const videoPlayerContainer = document.getElementById('video-player-container');
            if (videoPlayerContainer) {
                window.scrollTo({ top: videoPlayerContainer.offsetTop, behavior: 'smooth' });
            } else {
                console.warn('Le conteneur du lecteur vidéo ("video-player-container") est introuvable.');
            }
        });

        movieListDiv.appendChild(movieItem);
    }
});