document.addEventListener('DOMContentLoaded', () => {
    const m3uUrl = 'https://mikefri.github.io/Teslatv/vod.m3u';
    const proxyUrl = 'https://proxy-tesla-tv.vercel.app/api';
    const movieListDiv = document.getElementById('movie-list');
    const videoPlayer = document.getElementById('video-player');
    const loadingMessage = document.getElementById('loading-message');

    // Vérification des éléments DOM requis au démarrage
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
        // Si les dimensions sont 0x0, la vidéo n'est pas décodée correctement (ou est invisible)
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
        // event.target.error est un objet MediaError
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

    // --- Fin des écouteurs d'événements ---

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

        movieItem.addEventListener('click', () => {
            const proxiedMovieUrl = `${proxyUrl}?url=${encodeURIComponent(movie.url)}`;
            console.log('Lecture via proxy:', proxiedMovieUrl);

            // --- Logique de lecture vidéo ---
            // Pour l'exemple de Google, c'est un MP4 direct, donc HLS.js n'est pas nécessaire.
            // Nous allons forcer la lecture native pour ce diagnostic.
            
            // Si vous avez inclus HLS.js, assurez-vous de le gérer proprement si vous l'utilisiez avant.
            // Pour ce test, nous allons le désactiver pour se concentrer sur le lecteur natif.
            // Si hls était défini et attaché, détruisez-le avant de changer la source.
            if (typeof hls !== 'undefined' && hls) { // Vérifie si la variable hls existe et a une valeur
                console.log('Détection: Instance HLS.js existante. Destruction pour lecture native.');
                hls.destroy();
                hls = null; // Réinitialise la variable
            }

            videoPlayer.src = proxiedMovieUrl;
            videoPlayer.load(); // Indique au navigateur de charger la nouvelle source

            // Assurez-vous que le volume n'est pas à zéro et que la vidéo n'est pas muette
            videoPlayer.volume = 1; // Ou la valeur par défaut que vous souhaitez (entre 0 et 1)
            videoPlayer.muted = false;

            videoPlayer.play() // Tente de démarrer la lecture
                .then(() => {
                    console.log('Tentation de lecture automatique réussie.');
                })
                .catch(playError => {
                    console.error('Erreur lors de la lecture automatique de la vidéo:', playError);
                    alert('La lecture automatique a été bloquée par le navigateur. Veuillez cliquer sur le bouton de lecture (si visible).');
                    // Cela arrive souvent sur mobile pour des raisons de consommation de données et batterie.
                    // Si le problème persiste, cela pourrait être dû à un overlay ou un bouton de lecture qui cache la vidéo.
                });

            // Défilement fluide vers le lecteur vidéo
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