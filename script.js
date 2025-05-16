document.addEventListener('DOMContentLoaded', () => {
    // Contenedores de vistas y elementos UI
    const titleSelectionView = document.getElementById('title-selection-view');
    const songVersionsView = document.getElementById('song-versions-view');
    const titleListContainer = document.getElementById('title-list');
    const songLibraryContainer = document.getElementById('song-library'); // Donde se mostrarán las versiones
    const allSongsContainer = document.getElementById('all-songs-container'); // Contenedor original
    
    const backToTitlesBtn = document.getElementById('back-to-titles-btn');
    const playAllVersionsBtn = document.getElementById('play-all-versions-btn');
    const currentTitleDisplay = document.getElementById('current-title-display');

    let songsData = {}; // { "Titulo Grupo": [songElement1, songElement2], ... }
    let currentVisibleSongElements = []; // Elementos de canción actualmente en songLibraryContainer
    let currentPlaylist = []; // Lista de reproducción actual (elementos de audio)
    let currentTrackIndex = -1;
    let globalAudioContext; // Para asegurar que el contexto de audio se inicia con un gesto del usuario

    // Inicializar el contexto de audio (importante para autoplay en algunos navegadores)
    function initAudioContext() {
        if (!globalAudioContext) {
            globalAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }
    // Es buena idea llamar a initAudioContext() en el primer evento de click del usuario,
    // por ejemplo, al seleccionar un título o al presionar un botón de play.

    // --- PROCESAMIENTO INICIAL DE CANCIONES ---
    function processAllSongs() {
        const songItems = Array.from(allSongsContainer.querySelectorAll('.song-item'));
        songItems.forEach(item => {
            const group = item.dataset.songTitleGroup;
            if (!songsData[group]) {
                songsData[group] = [];
            }
            songsData[group].push(item); // Guardamos el elemento DOM completo
            
            // Configurar cada canción individualmente (como antes, pero adaptado)
            setupSongItem(item);
        });
        populateTitleSelectionView();
    }

    function populateTitleSelectionView() {
        titleListContainer.innerHTML = ''; // Limpiar lista anterior
        Object.keys(songsData).forEach(groupTitle => {
            const listItem = document.createElement('button');
            listItem.classList.add('title-list-item');
            listItem.textContent = groupTitle;
            listItem.addEventListener('click', () => {
                initAudioContext(); // Iniciar contexto de audio al interactuar
                displaySongVersions(groupTitle);
            });
            titleListContainer.appendChild(listItem);
        });
    }

    function displaySongVersions(groupTitle) {
        titleSelectionView.style.display = 'none';
        songVersionsView.style.display = 'block';
        backToTitlesBtn.style.display = 'inline-flex';
        playAllVersionsBtn.style.display = 'inline-flex';
        currentTitleDisplay.textContent = groupTitle;

        songLibraryContainer.innerHTML = ''; // Limpiar versiones anteriores
        currentVisibleSongElements = []; // Resetear lista de elementos visibles

        const versions = songsData[groupTitle] || [];
        versions.forEach(songElement => {
            songLibraryContainer.appendChild(songElement); // Mover el elemento a la vista de versiones
            currentVisibleSongElements.push(songElement);
        });
        // Re-asignar listeners de prev/next para el contexto actual
        updatePrevNextButtonListeners(); 
    }
    
    backToTitlesBtn.addEventListener('click', () => {
        songVersionsView.style.display = 'none';
        playAllVersionsBtn.style.display = 'none';
        backToTitlesBtn.style.display = 'none';
        currentTitleDisplay.textContent = '';
        titleSelectionView.style.display = 'block';
        
        // Detener cualquier reproducción activa al volver
        stopAllAudio();
        currentVisibleSongElements.forEach(item => songLibraryContainer.removeChild(item)); // Limpiar
        currentVisibleSongElements = [];
    });

    // --- LÓGICA DEL REPRODUCTOR DE AUDIO ---
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }

    function resetVideoState(songItem) {
        const videoWrapper = songItem.querySelector('.video-wrapper');
        const iframe = videoWrapper.querySelector('iframe');
        if (iframe) iframe.remove();
        songItem.querySelector('.song-cover').style.display = 'block';
        const playVidBtn = songItem.querySelector('.play-video-btn');
        if (playVidBtn) playVidBtn.style.display = 'flex';
    }

    function playVideoForSongItem(songItem) {
        initAudioContext(); // Iniciar contexto de audio
        currentVisibleSongElements.forEach(item => {
            if (item !== songItem) resetVideoState(item);
        });
        stopAllAudio(); // Detener audio si se reproduce un video

        const videoWrapper = songItem.querySelector('.video-wrapper');
        const youtubeId = songItem.dataset.youtubeId;
        if (!youtubeId || videoWrapper.querySelector('iframe')) return;

        songItem.querySelector('.song-cover').style.display = 'none';
        const playVidBtn = songItem.querySelector('.play-video-btn');
        if (playVidBtn) playVidBtn.style.display = 'none';

        const iframe = document.createElement('iframe');
        // Usar la URL de embed correcta y permitir autoplay (puede ser bloqueado por el navegador)
        iframe.src = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=0&loop=1&playlist=${youtubeId}`;
        iframe.title = "YouTube video player";
        iframe.frameBorder = "0";
        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
        iframe.allowFullscreen = true;
        videoWrapper.appendChild(iframe);
        setActiveSong(songItem);
    }

    function playAudio(audioElement, songItem) {
        initAudioContext(); // Iniciar contexto de audio
        // Pausar todos los demás audios y resetear su UI
        document.querySelectorAll('audio').forEach(otherAudio => {
            if (otherAudio !== audioElement && !otherAudio.paused) {
                const otherItem = otherAudio.closest('.song-item');
                if (otherItem) pauseAudioUI(otherAudio, otherItem);
            }
        });
        // Resetear videos de OTROS items
        currentVisibleSongElements.forEach(item => {
            if (item !== songItem) resetVideoState(item);
        });
        
        audioElement.play().then(() => {
            playAudioUI(audioElement, songItem);
        }).catch(error => console.error("Error al reproducir audio:", error));
    }
    
    function playAudioUI(audioElement, songItem) {
        const playIcon = songItem.querySelector('.play-icon');
        const pauseIcon = songItem.querySelector('.pause-icon');
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
        songItem.querySelector('.play-pause-btn').setAttribute('aria-label', 'Pause');
        setActiveSong(songItem);
    }

    function pauseAudio(audioElement, songItem) {
        audioElement.pause();
        pauseAudioUI(audioElement, songItem);
    }

    function pauseAudioUI(audioElement, songItem) {
        const playIcon = songItem.querySelector('.play-icon');
        const pauseIcon = songItem.querySelector('.pause-icon');
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
        songItem.querySelector('.play-pause-btn').setAttribute('aria-label', 'Play');
        // No remover active-song aquí, podría estar pausado pero seguir activo
    }
    
    function stopAllAudio() {
        document.querySelectorAll('audio').forEach(audioEl => {
            if (!audioEl.paused) {
                const item = audioEl.closest('.song-item');
                if (item) pauseAudio(audioEl, item);
            }
        });
        clearActiveSong();
    }

    function setActiveSong(songItem) {
        clearActiveSong();
        if (songItem) {
            songItem.classList.add('active-song');
            songItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    function clearActiveSong() {
        currentVisibleSongElements.forEach(item => item.classList.remove('active-song'));
    }
    
    function setupSongItem(item) {
        const audio = item.querySelector('audio');
        const playPauseBtn = item.querySelector('.play-pause-btn');
        const progressBarContainer = item.querySelector('.progress-bar-container');
        const progressBarFilled = item.querySelector('.progress-bar-filled');
        const currentTimeDisplay = item.querySelector('.current-time');
        const totalTimeDisplay = item.querySelector('.total-time');
        const playVideoBtn = item.querySelector('.play-video-btn');

        if (playVideoBtn) {
            playVideoBtn.addEventListener('click', () => playVideoForSongItem(item));
        }
        const songCover = item.querySelector('.song-cover');
        if (songCover && !playVideoBtn) { // Si no hay botón dedicado, la portada reproduce video
             songCover.addEventListener('click', () => playVideoForSongItem(item));
        }

        audio.addEventListener('loadedmetadata', () => {
            totalTimeDisplay.textContent = audio.duration && isFinite(audio.duration) ? formatTime(audio.duration) : "0:00";
        });
        audio.addEventListener('durationchange', () => { // Para fuentes que cargan duración más tarde
            totalTimeDisplay.textContent = audio.duration && isFinite(audio.duration) ? formatTime(audio.duration) : "0:00";
        });

        playPauseBtn.addEventListener('click', () => {
            if (audio.paused) playAudio(audio, item);
            else pauseAudio(audio, item);
        });

        audio.addEventListener('timeupdate', () => {
            if (audio.duration && isFinite(audio.duration)) {
                const progressPercent = (audio.currentTime / audio.duration) * 100;
                progressBarFilled.style.width = `${progressPercent}%`;
                currentTimeDisplay.textContent = formatTime(audio.currentTime);
            } else { // Manejar casos donde la duración no está disponible o es infinita (streaming)
                progressBarFilled.style.width = `0%`;
                currentTimeDisplay.textContent = formatTime(audio.currentTime); // Mostrar tiempo actual de todas formas
            }
        });

        progressBarContainer.addEventListener('click', (e) => {
            if (audio.duration && isFinite(audio.duration)) {
                const progressBarRect = progressBarContainer.getBoundingClientRect();
                const clickPositionX = e.clientX - progressBarRect.left;
                audio.currentTime = (clickPositionX / progressBarRect.width) * audio.duration;
            }
        });

        audio.addEventListener('ended', () => {
            pauseAudioUI(audio, item); // Reset UI
            progressBarFilled.style.width = '0%';
            audio.currentTime = 0;
            // Lógica de playlist: reproducir siguiente
            if (currentPlaylist.length > 0 && currentTrackIndex < currentPlaylist.length - 1) {
                currentTrackIndex++;
                playTrackInPlaylist(currentTrackIndex);
            } else if (currentPlaylist.length > 0 && currentTrackIndex === currentPlaylist.length - 1) {
                // Opcional: detener al final de la playlist o repetir
                stopAllAudio(); // Detener y limpiar
                currentPlaylist = [];
                currentTrackIndex = -1;
            }
        });
        resetVideoState(item); // Asegurar que la portada se muestra inicialmente
    }

    function updatePrevNextButtonListeners() {
        currentVisibleSongElements.forEach((item, currentIndex) => {
            const prevSongBtn = item.querySelector('.prev-song-btn');
            const nextSongBtn = item.querySelector('.next-song-btn');
            const audio = item.querySelector('audio');

            nextSongBtn.onclick = () => { // Usar onclick para reemplazar fácilmente
                pauseAudio(audio, item);
                resetVideoState(item);
                const nextIdx = (currentIndex + 1) % currentVisibleSongElements.length;
                const nextItem = currentVisibleSongElements[nextIdx];
                playAudio(nextItem.querySelector('audio'), nextItem);
            };
            prevSongBtn.onclick = () => {
                pauseAudio(audio, item);
                resetVideoState(item);
                const prevIdx = (currentIndex - 1 + currentVisibleSongElements.length) % currentVisibleSongElements.length;
                const prevItem = currentVisibleSongElements[prevIdx];
                playAudio(prevItem.querySelector('audio'), prevItem);
            };
        });
    }
    
    // --- LÓGICA DE PLAYLIST ---
    playAllVersionsBtn.addEventListener('click', () => {
        if (currentVisibleSongElements.length > 0) {
            initAudioContext(); // Iniciar contexto de audio
            currentPlaylist = currentVisibleSongElements.map(item => item.querySelector('audio'));
            currentTrackIndex = 0;
            playTrackInPlaylist(currentTrackIndex);
        }
    });

    function playTrackInPlaylist(index) {
        if (index >= 0 && index < currentPlaylist.length) {
            const audioToPlay = currentPlaylist[index];
            const songItem = audioToPlay.closest('.song-item');
            if (songItem) {
                // Detener videos y otros audios
                currentVisibleSongElements.forEach(item => {
                    resetVideoState(item);
                    const otherAudio = item.querySelector('audio');
                    if (otherAudio !== audioToPlay && !otherAudio.paused) {
                        pauseAudio(otherAudio, item);
                    }
                });
                playAudio(audioToPlay, songItem);
            }
        }
    }

    // --- INICIO ---
    processAllSongs(); 
});
