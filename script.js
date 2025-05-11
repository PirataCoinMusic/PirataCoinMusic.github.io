document.addEventListener('DOMContentLoaded', () => {
    const allSongItems = Array.from(document.querySelectorAll('.song-item'));
    const allAudioElements = document.querySelectorAll('audio');

    // Format time in MM:SS
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }

    function resetVideoState(songItem) {
        const videoWrapper = songItem.querySelector('.video-wrapper');
        const iframe = videoWrapper.querySelector('iframe');
        if (iframe) {
            iframe.remove();
        }
        songItem.querySelector('.song-cover').style.display = 'block';
        const playVidBtn = songItem.querySelector('.play-video-btn');
        if(playVidBtn) playVidBtn.style.display = 'flex';
    }

    function playVideoForSongItem(songItem) {
        // Reset other videos
        allSongItems.forEach(item => {
            if (item !== songItem) {
                resetVideoState(item);
            }
        });

        const videoWrapper = songItem.querySelector('.video-wrapper');
        const youtubeId = songItem.dataset.youtubeId;
        if (!youtubeId || videoWrapper.querySelector('iframe')) return; // Don't recreate if exists

        songItem.querySelector('.song-cover').style.display = 'none';
        const playVidBtn = songItem.querySelector('.play-video-btn');
        if(playVidBtn) playVidBtn.style.display = 'none';


        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&playlist=${youtubeId}`;
        iframe.title = "YouTube video player";
        iframe.frameBorder = "0";
        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
        iframe.allowFullscreen = true;
        videoWrapper.appendChild(iframe);
    }

    function playAudio(audioElement, songItem) {
        // Pause all other audios and reset their UI
        allAudioElements.forEach(otherAudio => {
            if (otherAudio !== audioElement && !otherAudio.paused) {
                otherAudio.pause();
                const otherItem = otherAudio.closest('.song-item');
                if (otherItem) {
                    const otherPlayIcon = otherItem.querySelector('.play-icon');
                    const otherPauseIcon = otherItem.querySelector('.pause-icon');
                    if (otherPlayIcon && otherPauseIcon) {
                        otherPlayIcon.style.display = 'block';
                        otherPauseIcon.style.display = 'none';
                        otherItem.querySelector('.play-pause-btn').setAttribute('aria-label', 'Play');
                    }
                }
            }
        });

        // Reset videos of OTHER songs
        allSongItems.forEach(item => {
            if (item !== songItem) {
                resetVideoState(item);
            }
        });
        
        audioElement.play();
        const playIcon = songItem.querySelector('.play-icon');
        const pauseIcon = songItem.querySelector('.pause-icon');
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
        songItem.querySelector('.play-pause-btn').setAttribute('aria-label', 'Pause');
    }

    function pauseAudio(audioElement, songItem) {
        audioElement.pause();
        const playIcon = songItem.querySelector('.play-icon');
        const pauseIcon = songItem.querySelector('.pause-icon');
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
        songItem.querySelector('.play-pause-btn').setAttribute('aria-label', 'Play');
    }


    allSongItems.forEach((item, currentIndex) => {
        const audio = item.querySelector('audio');
        const playPauseBtn = item.querySelector('.play-pause-btn');
        const playIcon = item.querySelector('.play-icon');
        const pauseIcon = item.querySelector('.pause-icon');
        const progressBarContainer = item.querySelector('.progress-bar-container');
        const progressBarFilled = item.querySelector('.progress-bar-filled');
        const currentTimeDisplay = item.querySelector('.current-time');
        const totalTimeDisplay = item.querySelector('.total-time');
        const playVideoBtn = item.querySelector('.play-video-btn');
        const prevSongBtn = item.querySelector('.prev-song-btn');
        const nextSongBtn = item.querySelector('.next-song-btn');

        // Video play button
        if (playVideoBtn) {
            playVideoBtn.addEventListener('click', () => {
                playVideoForSongItem(item);
            });
        }
        // Also allow clicking the cover itself (if no button is preferred)
        const songCover = item.querySelector('.song-cover');
        if (songCover && !playVideoBtn) { // If there's no dedicated button, cover click plays video
             songCover.addEventListener('click', () => {
                playVideoForSongItem(item);
            });
        }


        // Update total time when metadata loads
        audio.addEventListener('loadedmetadata', () => {
            if (audio.duration && isFinite(audio.duration)) {
                totalTimeDisplay.textContent = formatTime(audio.duration);
            } else {
                totalTimeDisplay.textContent = "0:00"; 
            }
        });
        
        audio.addEventListener('durationchange', () => {
            if (audio.duration && isFinite(audio.duration)) {
                totalTimeDisplay.textContent = formatTime(audio.duration);
            }
        });

        // Play/Pause functionality
        playPauseBtn.addEventListener('click', () => {
            if (audio.paused) {
                playAudio(audio, item);
            } else {
                pauseAudio(audio, item);
            }
        });

        // Update progress bar and current time
        audio.addEventListener('timeupdate', () => {
            if (audio.duration && isFinite(audio.duration)) {
                const progressPercent = (audio.currentTime / audio.duration) * 100;
                progressBarFilled.style.width = `${progressPercent}%`;
                currentTimeDisplay.textContent = formatTime(audio.currentTime);
            } else {
                progressBarFilled.style.width = `0%`;
                currentTimeDisplay.textContent = formatTime(audio.currentTime);
            }
        });

        // Seek functionality
        progressBarContainer.addEventListener('click', (e) => {
            if (audio.duration && isFinite(audio.duration)) {
                const progressBarRect = progressBarContainer.getBoundingClientRect();
                const clickPositionX = e.clientX - progressBarRect.left;
                const seekTime = (clickPositionX / progressBarRect.width) * audio.duration;
                audio.currentTime = seekTime;
            }
        });

        // Reset when audio ends
        audio.addEventListener('ended', () => {
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
            playPauseBtn.setAttribute('aria-label', 'Play');
            progressBarFilled.style.width = '0%';
            audio.currentTime = 0;
            currentTimeDisplay.textContent = formatTime(0);
        });

        // Skip song functionality
        nextSongBtn.addEventListener('click', () => {
            pauseAudio(audio, item); // Pause current song
            resetVideoState(item);   // Reset current song's video to cover
            const nextIndex = (currentIndex + 1) % allSongItems.length;
            const nextSongItem = allSongItems[nextIndex];
            const nextAudio = nextSongItem.querySelector('audio');
            playAudio(nextAudio, nextSongItem);
            nextSongItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });

        prevSongBtn.addEventListener('click', () => {
            pauseAudio(audio, item); // Pause current song
            resetVideoState(item);   // Reset current song's video to cover
            const prevIndex = (currentIndex - 1 + allSongItems.length) % allSongItems.length;
            const prevSongItem = allSongItems[prevIndex];
            const prevAudio = prevSongItem.querySelector('audio');
            playAudio(prevAudio, prevSongItem);
            prevSongItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });

        // Ensure cover is shown initially
        resetVideoState(item); 
    });
});