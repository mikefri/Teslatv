document.addEventListener('DOMContentLoaded', () => {
    const channelList = document.getElementById('channel-list');
    const videoElement = document.getElementById('videoPlayer');
    const videoContainer = document.getElementById('video-container'); // Assurez-vous d'avoir un conteneur pour le lecteur
    let currentHls = null; // Pour gérer l'instance HLS.js

    // URL de base de votre proxy Vercel
    const PROXY_BASE_URL = 'https://proxy-tesla-tv.vercel.app/api?url=';

    // Fonction pour charger une chaîne
    async function loadChannel(url) {
        // Détruire l'instance HLS.js existante si elle y est
        if (currentHls) {
            currentHls.destroy();
            currentHls = null;
        }

        // Réinitialiser la source de la vidéo
        videoElement.src = '';
        videoElement.removeAttribute('type'); // Supprime l'attribut type pour le lecteur natif
        videoElement.load(); // Recharge l'élément vidéo

        let finalUrl = url;
        const isHLS = url.includes('.m3u8'); // Indicateur si c'est un HLS (simple vérification par extension)
        const isDirectStream = url.includes('oknirvana.club'); // Indicateur pour votre flux direct spécifique

        // Appliquer le proxy si l'URL est HTTP
        if (url.startsWith('http://') && !isHLS) { // Applique le proxy pour les flux directs HTTP
            const encodedUrl = encodeURIComponent(url);
            finalUrl = PROXY_BASE_URL + encodedUrl;
            console.log(`[Client] Redirection du flux HTTP via le proxy : ${finalUrl}`);
        } else if (url.startsWith('http://') && isHLS) { // Si c'est un HLS en HTTP, il doit aussi passer par le proxy
            const encodedUrl = encodeURIComponent(url);
            finalUrl = PROXY_BASE_URL + encodedUrl;
            console.log(`[Client] Redirection du flux HLS HTTP via le proxy : ${finalUrl}`);
        }

        // Logique de sélection du lecteur
        if (isHLS) { // Si c'est un HLS (basé sur l'extension .m3u8)
            console.log(`[Client] Tentative de lecture HLS avec hls.js pour : ${finalUrl}`);
            if (Hls.isSupported()) {
                currentHls = new Hls();
                currentHls.loadSource(finalUrl);
                currentHls.attachMedia(videoElement);
                currentHls.on(Hls.Events.MANIFEST_PARSED, function() {
                    videoElement.play();
                });
                currentHls.on(Hls.Events.ERROR, function(event, data) {
                    console.error('Erreur HLS:', data);
                    // Gérer les erreurs HLS. Pour les flux non HLS, cela peut encore arriver.
                    // Afficher un message d'erreur à l'utilisateur
                    if (data.fatal) {
                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                console.error('Erreur réseau HLS, tentative de récupération...');
                                // Si c'est une erreur de réseau et qu'il n'y a pas d'autres options,
                                // vous pourriez tenter la lecture native ici en dernier recours.
                                // Mais ce n'est pas idéal car on sait que c'est HLS.
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                console.error('Erreur média HLS, tentative de récupération...');
                                currentHls.recoverMediaError();
                                break;
                            default:
                                console.error('Erreur fatale détectée, tentative de récupération...');
                                currentHls.destroy(); // Détruire l'instance HLS pour éviter d'autres erreurs.
                                // Tenter de lire directement si hls.js échoue (peut être utile pour des cas limites)
                                console.log(`[Client] hls.js a échoué. Tentative de lecture native pour : ${finalUrl}`);
                                videoElement.src = finalUrl;
                                videoElement.play().catch(e => console.error("Erreur de lecture native:", e));
                                break;
                        }
                    }
                });
            } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
                // Pour Safari ou autres navigateurs qui supportent HLS nativement
                console.log(`[Client] Lecture HLS native pour : ${finalUrl}`);
                videoElement.src = finalUrl;
                videoElement.play().catch(e => console.error("Erreur de lecture native (HLS):", e));
            } else {
                console.error('Le navigateur ne supporte pas HLS.');
                videoContainer.innerHTML = "<p>Votre navigateur ne supporte pas la lecture de cette chaîne (HLS).</p>";
            }
        } else { // Si ce n'est PAS un HLS (MPEG-TS direct via proxy, ou autre)
            console.log(`[Client] Tentative de lecture native pour : ${finalUrl}`);
            // Configurer le type MIME si le proxy le renvoie correctement (video/mp2t)
            videoElement.src = finalUrl;
            videoElement.type = 'video/mp2t'; // Spécifie le type pour aider le navigateur
            videoElement.play().catch(e => {
                console.error("Erreur de lecture native:", e);
                videoContainer.innerHTML = "<p>Impossible de lire cette chaîne directement. Format non supporté ou erreur réseau.</p>";
            });
        }
    }

    // Chargement des chaînes depuis channels.json
    fetch('channels.json')
        .then(response => response.json())
        .then(channels => {
            channels.forEach(channel => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <img src="${channel.logo}" alt="${channel.name} Logo" style="width: 50px; height: 50px; margin-right: 10px;">
                    ${channel.name}
                    ${channel.needsVPN ? '<span style="color: red; font-size: 0.8em; margin-left: 5px;"> (VPN Requis)</span>' : ''}
                `;
                li.onclick = () => loadChannel(channel.url);
                channelList.appendChild(li);
            });
        })
        .catch(error => console.error('Erreur lors du chargement des chaînes:', error));
});
