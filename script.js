document.addEventListener('DOMContentLoaded', () => {
    // User Interface Elements
    const titleSelectionView = document.getElementById('title-selection-view');
    const songVersionsView = document.getElementById('song-versions-view');
    const titleListContainer = document.getElementById('title-list');
    const songLibraryContainer = document.getElementById('song-library');
    const allSongsContainer = document.getElementById('all-songs-container');
    
    const backToTitlesBtn = document.getElementById('back-to-titles-btn');
    const currentTitleDisplay = document.getElementById('current-title-display');

    let songsData = {}; // Stores { "Group Title": [songElement1, songElement2], ... }
    let currentVisibleSongElements = []; // Song elements currently visible in songLibraryContainer
    let currentlyPlayingMegaIframe = null; // Reference to the currently active Mega iframe

    // 1. INITIAL SONG PROCESSING
    function processAllSongs() {
        const songItems = Array.from(allSongsContainer.querySelectorAll('.song-item'));
        songItems.forEach(item => {
            const group = item.dataset.songTitleGroup;
            if (!songsData[group]) {
                songsData[group] = [];
            }
            songsData[group].push(item); // Store the complete DOM element
            setupSongItem(item); // Set up listeners for each song
        });
        populateTitleSelectionView(); // Populate the title selection view
    }

    // 2. POPULATE TITLE SELECTION VIEW
    function populateTitleSelectionView() {
        titleListContainer.innerHTML = ''; // Clear previous list
        Object.keys(songsData).forEach(groupTitle => {
            const listItem = document.createElement('button');
            listItem.classList.add('title-list-item');
            listItem.textContent = groupTitle;
            listItem.addEventListener('click', () => {
                displaySongVersions(groupTitle);
            });
            titleListContainer.appendChild(listItem);
        });
    }

    // 3. DISPLAY SONG VERSIONS FOR A SELECTED TITLE
    function displaySongVersions(groupTitle) {
        titleSelectionView.style.display = 'none';
        songVersionsView.style.display = 'block';
        backToTitlesBtn.style.display = 'inline-flex';
        currentTitleDisplay.textContent = groupTitle;

        songLibraryContainer.innerHTML = ''; // Clear previous versions
        currentVisibleSongElements = []; // Reset list of visible elements

        const versions = songsData[groupTitle] || [];
        versions.forEach(songElement => {
            songLibraryContainer.appendChild(songElement); // Move the element to the versions view
            currentVisibleSongElements.push(songElement);
        });
        updatePrevNextButtonListeners(); // Update prev/next listeners for the current context
    }
    
    // 4. BACK TO TITLES BUTTON
    backToTitlesBtn.addEventListener('click', () => {
        songVersionsView.style.display = 'none';
        backToTitlesBtn.style.display = 'none';
        currentTitleDisplay.textContent = '';
        titleSelectionView.style.display = 'block';
        
        clearAllMegaIframes(); // Stop and clear iframes when going back
        currentVisibleSongElements.forEach(item => {
            // Check if the item is still a child of songLibraryContainer before trying to remove it
            if (item.parentElement === songLibraryContainer) { 
                 songLibraryContainer.removeChild(item);
            }
        });
        currentVisibleSongElements = [];
        clearActiveSong();
    });

    // 5. SETUP EACH SONG ITEM
    function setupSongItem(songItem) {
        const playMegaBtn = songItem.querySelector('.play-mega-btn');

        if (playMegaBtn) {
            playMegaBtn.addEventListener('click', () => {
                loadAndPlayMegaIframe(songItem);
            });
        }
    }

    // 6. LOAD AND PLAY MEGA IFRAME
    function loadAndPlayMegaIframe(songItem) {
        if (!songItem) return;

        // Clear any previously playing iframe in *any* song item
        clearAllMegaIframes(songItem); 

        const megaEmbedUrl = songItem.dataset.megaEmbedUrl;
        const iframeContainer = songItem.querySelector('.mega-iframe-container');
        
        // Ensure the container for the current song item is empty before adding a new iframe
        if(iframeContainer) iframeContainer.innerHTML = '';


        if (megaEmbedUrl && iframeContainer) {
            const iframe = document.createElement('iframe');
            iframe.src = megaEmbedUrl;
            iframe.setAttribute('frameborder', '0');
            iframe.setAttribute('allowfullscreen', 'true');
            // Mega recommends not setting width/height directly on the iframe
            // but on the container, or using their URL parameters if available.
            // In this case, CSS handles the container size.
            
            iframeContainer.appendChild(iframe);
            currentlyPlayingMegaIframe = iframe; // Store reference to the new iframe
            setActiveSong(songItem);
        }
    }
    
    // 7. CLEAR ALL MEGA IFRAMES (except the one for itemToKeepActive, if provided)
    function clearAllMegaIframes(itemToKeepActive = null) {
        document.querySelectorAll('.song-item').forEach(item => {
            if (item !== itemToKeepActive) { // Don't clear the iframe of the item that is about to play
                const iframeContainer = item.querySelector('.mega-iframe-container');
                if (iframeContainer) {
                    iframeContainer.innerHTML = ''; // Removes the iframe
                }
            }
        });
        // If no item is specified to keep active (e.g., when going back to titles),
        // or if the active item is being cleared, reset the global reference.
        if (!itemToKeepActive || (itemToKeepActive && currentlyPlayingMegaIframe && !itemToKeepActive.contains(currentlyPlayingMegaIframe))) {
            currentlyPlayingMegaIframe = null;
        }
    }
    
    // 8. HANDLE ACTIVE SONG (VISUAL)
    function setActiveSong(songItem) {
        clearActiveSong(); // Clear 'active-song' class from other items
        if (songItem) {
            songItem.classList.add('active-song');
            // Optional: scroll to the active item if it's out of view
            // songItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    function clearActiveSong() {
        currentVisibleSongElements.forEach(item => item.classList.remove('active-song'));
    }
    
    // 9. UPDATE LISTENERS FOR PREV/NEXT BUTTONS
    function updatePrevNextButtonListeners() {
        currentVisibleSongElements.forEach((item, currentIndex) => {
            const prevSongBtn = item.querySelector('.prev-song-btn');
            const nextSongBtn = item.querySelector('.next-song-btn');

            nextSongBtn.onclick = () => { // Using onclick to easily replace
                const nextIdx = (currentIndex + 1) % currentVisibleSongElements.length;
                const nextItem = currentVisibleSongElements[nextIdx];
                loadAndPlayMegaIframe(nextItem);
            };
            prevSongBtn.onclick = () => {
                const prevIdx = (currentIndex - 1 + currentVisibleSongElements.length) % currentVisibleSongElements.length;
                const prevItem = currentVisibleSongElements[prevIdx];
                loadAndPlayMegaIframe(prevItem);
            };
        });
    }

    // --- APPLICATION START ---
    processAllSongs(); 
});
