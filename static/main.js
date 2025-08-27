let currentFile = null;
const API_BASE = "/api";
let musicData = null;
let editHistory = [];
let originalFile = null;

// Wait for DOM to be loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing...');
    
    // Check if all required elements are available
    const requiredElements = [
        'mainVideoSection',
        'videoHeaderSection', 
        'uploadSection',
        'processingSteps',
        'uploadStatus',
        'actionButtonsSection',
        'editHistorySection',
        'uploadZone',
        'videoPlayer',
        'currentVideoName',
        'videoUpload'
    ];
    
    const missingElements = [];
    requiredElements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (!element) {
            missingElements.push(elementId);
            console.error(`Required element not found: ${elementId}`);
        }
    });
    
    if (missingElements.length > 0) {
        console.error('Missing required elements:', missingElements);
        console.error('Application may not function correctly');
        return;
    }
    
    console.log('All required elements found, proceeding with initialization...');
    
    // Initialize event listeners
    initializeEventListeners();
    
    // Make all functions globally accessible
    window.runRemoveDuplicates = runRemoveDuplicates;
    window.addCaptions = addCaptions;
    window.addMusic = addMusic;
    window.addBroll = addBroll;
    window.runAiEdit = runAiEdit;
    window.showMessage = showMessage;
    window.updateStepIndicator = updateStepIndicator;
    window.undoLastEdit = undoLastEdit;
    window.downloadVideo = downloadVideo;
    
    console.log('Functions made global:', {
        runRemoveDuplicates: typeof window.runRemoveDuplicates,
        addCaptions: typeof window.addCaptions,
        addMusic: typeof window.addMusic,
        addBroll: typeof window.addBroll,
        runAiEdit: typeof window.runAiEdit,
        undoLastEdit: typeof window.undoLastEdit,
        downloadVideo: typeof window.downloadVideo
    });
    
    console.log('Application initialization complete');
});

function initializeEventListeners() {
    console.log('Initializing event listeners...');
    
    // Video upload event listener
    const videoUpload = document.getElementById('videoUpload');
    if (videoUpload) {
        videoUpload.addEventListener('change', handleVideoUpload);
        console.log('Video upload listener added');
    } else {
        console.error('Video upload element not found');
    }
    
    // Volume slider event listener
    const volumeSlider = document.getElementById('input-music-volume');
    if (volumeSlider) {
        volumeSlider.addEventListener('input', function(e) {
            const volumeValue = document.getElementById('volume-value');
            if (volumeValue) {
                volumeValue.textContent = `${Math.round(e.target.value * 100)}%`;
            }
        });
        console.log('Volume slider listener added');
    } else {
        console.error('Volume slider element not found');
    }

    // Enhanced drag and drop functionality
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('videoUpload');
    
    if (uploadZone && fileInput) {
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });

        uploadZone.addEventListener('dragleave', (e) => {
            uploadZone.classList.remove('dragover');
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
                fileInput.dispatchEvent(new Event('change'));
            }
        });
        console.log('Drag and drop functionality added');
    } else {
        console.error('Upload zone or file input not found for drag and drop');
    }

    // Add event listeners for new buttons
    const undoBtn = document.getElementById('btn-undo');
    if (undoBtn) {
        undoBtn.addEventListener('click', function(e) {
            console.log('Undo button clicked');
            e.preventDefault();
            undoLastEdit();
        });
        console.log('Undo button listener added');
    }

    const downloadBtn = document.getElementById('btn-download');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function(e) {
            console.log('Download button clicked');
            e.preventDefault();
            downloadVideo();
        });
        console.log('Download button listener added');
    }

    // Add event listeners for header buttons
    const changeVideoBtn = document.getElementById('btn-change-video');
    if (changeVideoBtn) {
        changeVideoBtn.addEventListener('click', function(e) {
            console.log('Change video button clicked');
            e.preventDefault();
            document.getElementById('videoUpload').click();
        });
        console.log('Change video button listener added');
    }

    const headerDownloadBtn = document.getElementById('btn-download-header');
    if (headerDownloadBtn) {
        headerDownloadBtn.addEventListener('click', function(e) {
            console.log('Header download button clicked');
            e.preventDefault();
            downloadVideo();
        });
        console.log('Header download button listener added');
    }
}

async function handleVideoUpload(e) {
    console.log('Video upload triggered');
    const file = e.target.files[0];
    
    // Debug: Check all required elements
    const mainVideoSection = document.getElementById('mainVideoSection');
    const videoHeaderSection = document.getElementById('videoHeaderSection');
    const uploadSection = document.getElementById('uploadSection');
    const processingSteps = document.getElementById('processingSteps');
    const uploadStatus = document.getElementById('uploadStatus');
    const actionButtonsSection = document.getElementById('actionButtonsSection');
    const editHistorySection = document.getElementById('editHistorySection');
    const uploadZone = document.getElementById('uploadZone');
    const videoPlayer = document.getElementById('videoPlayer');
    const currentVideoName = document.getElementById('currentVideoName');
    
    console.log('Element availability check:', {
        mainVideoSection: !!mainVideoSection,
        videoHeaderSection: !!videoHeaderSection,
        uploadSection: !!uploadSection,
        processingSteps: !!processingSteps,
        uploadStatus: !!uploadStatus,
        actionButtonsSection: !!actionButtonsSection,
        editHistorySection: !!editHistorySection,
        uploadZone: !!uploadZone,
        videoPlayer: !!videoPlayer,
        currentVideoName: !!currentVideoName
    });
    
    // Log any missing elements
    if (!mainVideoSection) console.error('mainVideoSection element not found');
    if (!videoHeaderSection) console.error('videoHeaderSection element not found');
    if (!uploadSection) console.error('uploadSection element not found');
    if (!processingSteps) console.error('processingSteps element not found');
    if (!uploadStatus) console.error('uploadStatus element not found');
    if (!actionButtonsSection) console.error('actionButtonsSection element not found');
    if (!editHistorySection) console.error('editHistorySection element not found');
    if (!uploadZone) console.error('uploadZone element not found');
    if (!videoPlayer) console.error('videoPlayer element not found');
    if (!currentVideoName) console.error('currentVideoName element not found');

    try {
        // Reset UI with null checks
        currentFile = null;
        originalFile = null;
        editHistory = [];
        
        if (mainVideoSection) mainVideoSection.style.display = 'none';
        if (videoHeaderSection) videoHeaderSection.style.display = 'none';
        if (uploadSection) uploadSection.style.display = 'block';
        if (processingSteps) processingSteps.style.display = 'none';
        if (actionButtonsSection) actionButtonsSection.style.display = 'none';
        if (editHistorySection) editHistorySection.style.display = 'none';
        if (uploadStatus) uploadStatus.innerHTML = '';
        
        updateStepIndicator(1);

        // Show main video display
        if (videoPlayer) {
            videoPlayer.src = URL.createObjectURL(file);
            videoPlayer.load();
        } else {
            console.error('Cannot set video player source - videoPlayer element is null');
        }
        if (mainVideoSection) mainVideoSection.style.display = 'block';

        // Upload file
        console.log('Starting file upload...');
        console.log('File to upload:', {
            name: file.name,
            size: file.size,
            type: file.type
        });
        
        const data = await uploadFile(file, 'video');
        console.log('File upload response:', data);
        
        // Store references
        currentFile = {
            file_id: data.file_id,
            filename: data.filename,
            base_name: data.filename.split('.').slice(0, -1).join('.'),
            original_path: data.file_path
        };
        
        console.log('Current file object created:', currentFile);
        
        // Store original file info for undo functionality
        originalFile = {
            file_id: data.file_id,
            filename: data.filename,
            file_path: data.file_path
        };
        
        console.log('Original file object created:', originalFile);

        // Show video header and hide upload section
        if (videoHeaderSection) videoHeaderSection.style.display = 'block';
        if (uploadSection) uploadSection.style.display = 'none';
        
        // Update video header with file info
        if (currentVideoName) {
            currentVideoName.textContent = file.name;
        } else {
            console.error('Cannot update video name - currentVideoName element is null');
        }

        // Enable processing steps and action buttons
        if (processingSteps) processingSteps.style.display = 'block';
        if (actionButtonsSection) actionButtonsSection.style.display = 'block';
        updateStepIndicator(2);
        showMessage('Video uploaded successfully!', 'success');
        
        // Update undo button state
        updateUndoButtonState();
        updateDownloadButtonState();
        updateHeaderDownloadButtonState();

        // Re-attach event listeners to processing buttons
        attachProcessingButtonListeners();

    } catch (error) {
        e.target.value = ''; // Clear file input
        showMessage(`Video upload failed: ${error.message}`, 'danger');
    }
}

// Generic file upload handler
async function uploadFile(file, fileType) {
    try {
        if (!file) throw new Error('No file selected');
        
        // Client-side validation
        const validTypes = {
            video: ['video/mp4', 'video/quicktime'],
            music: ['audio/mpeg', 'audio/wav']
        };

        if (!validTypes[fileType].includes(file.type)) {
            throw new Error(`Invalid file type for ${fileType}`);
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('file_type', fileType);

        const response = await fetch(`${API_BASE}/files/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Upload failed');
        }

        return await response.json();
    } catch (error) {
        console.error('Upload error:', error);
        throw error; // Re-throw for calling function to handle
    }
}

async function runRemoveDuplicates() {
    console.log('runRemoveDuplicates called');
    if (!validateCurrentFile()) return;
    
    // Show processing overlay
    const processingOverlay = document.getElementById('processingOverlay');
    if (processingOverlay) {
        processingOverlay.classList.remove('d-none');
    }
    
    let dupThreshRaw = document.getElementById('dupThreshInput').value;
    let dupThresh = dupThreshRaw !== "" ? parseFloat(dupThreshRaw) : null;

    try {
        console.log("Requesting:", `${API_BASE}/process/${currentFile.file_id}/remove-duplicates`);
        const response = await fetch(`${API_BASE}/process/${currentFile.file_id}/remove-duplicates`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                params: {
                    filename: currentFile.filename,
                    model: 'base',
                    dedupe_threshold: dupThresh
                }
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        let task;
        do {
            await new Promise(r => setTimeout(r, 1000));
            const res = await fetch(`${API_BASE}/process/${data.task_id}/status`);
            task = await res.json();
        } while (task.status === "processing");

        if (task.status === "failed") {
            throw new Error(task.error);
        }

        // Add to edit history
        addToEditHistory('Remove Duplicates', currentFile.file_id, currentFile.filename);
        
        // Update current file with new processed path (but keep original file_id)
        currentFile.processed_path = task.result.download_url;
        
        showOutputResult(task);
        updateStepIndicator(3);
        
        // Hide processing overlay
        if (processingOverlay) {
            processingOverlay.classList.add('d-none');
        }

        // Update undo button state
        updateUndoButtonState();
        updateDownloadButtonState();
        
        // Ensure edit interface remains visible
        ensureEditInterfaceVisible();

    } catch (error) {
        showMessage(`Processing failed: ${error.message}`, 'danger');
        
        // Hide processing overlay on error
        if (processingOverlay) {
            processingOverlay.classList.add('d-none');
        }
    }
}

async function addCaptions() {
    console.log('addCaptions called');
    if (!validateCurrentFile()) return;
    
    const fontSize = document.getElementById('input-font-size').value || 28;
    
    // Show processing overlay
    const processingOverlay = document.getElementById('processingOverlay');
    if (processingOverlay) {
        processingOverlay.classList.remove('d-none');
    }
    
    try {
        console.log('Processing caption addition...');
        const response = await fetch(`${API_BASE}/process/${currentFile.file_id}/add-captions`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                params: { 
                    filename: currentFile.filename,
                    font_size: fontSize 
                }
            })
        });

        const data = await response.json();
        console.log('Caption processing response:', data);
        
        if (data.error) throw new Error(data.error);

        let task;
        do {
            await new Promise(r => setTimeout(r, 1000));
            const res = await fetch(`${API_BASE}/process/${data.task_id}/status`);
            task = await res.json();
            console.log('Caption processing status:', task.status);
        } while (task.status === "processing");

        if (task.status === "failed") {
            throw new Error(task.error);
        }

        console.log('Caption processing completed:', task);

        // Update current file with new processed path (but keep original file_id)
        currentFile.processed_path = task.result.download_url;
        
        showOutputResult(task);
        updateStepIndicator(3);
        
        // Hide processing overlay
        if (processingOverlay) {
            processingOverlay.classList.add('d-none');
        }

        // Add to edit history AFTER processing
        addToEditHistory('Add Captions', currentFile.file_id, currentFile.filename, { font_size: fontSize });

        // Update undo button state
        updateUndoButtonState();
        updateDownloadButtonState();
        
        // Ensure edit interface remains visible
        ensureEditInterfaceVisible();

    } catch (error) {
        console.error('Caption addition failed:', error);
        showMessage(`Captioning failed: ${error.message}`, 'danger');
        
        // Hide processing overlay on error
        if (processingOverlay) {
            processingOverlay.classList.add('d-none');
        }
    }
}

async function addMusic() {
    console.log('addMusic called');
    if (!validateCurrentFile()) return;
    
    // Get music file and volume
    const musicFileInput = document.getElementById('input-music-file');
    const musicVolumeInput = document.getElementById('input-music-volume');
    
    if (!musicFileInput || !musicFileInput.files[0]) {
        showMessage('Please select a music file', 'warning');
        return;
    }
    
    if (!musicVolumeInput) {
        showMessage('Music volume input not found', 'error');
        return;
    }
    
    const musicFile = musicFileInput.files[0];
    const musicVolume = musicVolumeInput.value || 0.5;
    
    // Show processing overlay
    const processingOverlay = document.getElementById('processingOverlay');
    if (processingOverlay) {
        processingOverlay.classList.remove('d-none');
    }
    
    try {
        console.log('Checking music file input...');
        console.log('Files in input:', musicFileInput.files);
        console.log('Number of files:', musicFileInput.files?.length);
        
        if (!musicFileInput.files?.[0]) {
            console.error('No music file selected');
            showMessage('Please select a music file', 'warning');
            
            // Hide processing overlay
            if (processingOverlay) {
                processingOverlay.classList.add('d-none');
            }
            return;
        }

        const musicFile = musicFileInput.files[0];
        console.log('Music file selected:', {
            name: musicFile.name,
            size: musicFile.size,
            type: musicFile.type
        });

        console.log('Starting music file upload...');
        musicData = await uploadFile(musicFile, 'music');
        console.log('Music file uploaded successfully:', musicData);

        console.log('Starting music processing...');
        console.log('Current file info:', {
            file_id: currentFile.file_id,
            filename: currentFile.filename,
            original_path: currentFile.original_path
        });
        console.log('API call to:', `${API_BASE}/process/${currentFile.file_id}/music`);
        console.log('Request payload:', {
            params: {
                filename: currentFile.filename,
                music_file_id: musicData.file_id,
                music_filename: musicData.filename,
                music_volume: musicVolume,
            }
        });
        
        const response = await fetch(`${API_BASE}/process/${currentFile.file_id}/music`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                params: {
                    filename: currentFile.filename,
                    music_file_id: musicData.file_id,
                    music_filename: musicData.filename,
                    music_volume: musicVolume,
                }
            })
        });

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        const data = await response.json();
        console.log('Music processing response:', data);
        
        if (data.error) {
            console.error('API returned error:', data.error);
            // Hide processing overlay
            if (processingOverlay) {
                processingOverlay.classList.add('d-none');
            }
            throw new Error(data.error);
        }
        
        console.log('Starting status polling...');
        let task;
        let pollCount = 0;
        do {
            await new Promise(r => setTimeout(r, 1000));
            pollCount++;
            console.log(`Polling attempt ${pollCount}...`);
            
            const res = await fetch(`${API_BASE}/process/${data.task_id}/status`);
            console.log('Status response status:', res.status);
            
            task = await res.json();
            console.log('Music processing status:', task.status);
        } while (task.status === "processing" && pollCount < 60); // Max 60 seconds

        if (task.status === "failed") {
            console.error('Task failed:', task.error);
            // Hide processing overlay
            if (processingOverlay) {
                processingOverlay.classList.add('d-none');
            }
            throw new Error(task.error);
        }

        console.log('Music processing completed successfully:', task);
        console.log('Task structure analysis:', {
            hasResult: !!task.result,
            resultType: typeof task.result,
            resultKeys: task.result ? Object.keys(task.result) : 'no result',
            fullTask: task
        });

        // Check if task.result exists and has download_url
        if (!task.result) {
            console.error('Task completed but result is undefined:', task);
            throw new Error('Task completed but no result returned from backend');
        }

        if (!task.result.download_url) {
            console.error('Task completed but download_url is missing:', task.result);
            throw new Error('Task completed but download URL is missing from result');
        }

        // Add to edit history
        addToEditHistory('Add Music', currentFile.file_id, currentFile.filename, { 
            music_filename: musicData.filename, 
            music_volume: musicVolume 
        });
        
        // Update current file with new processed path (but keep original file_id)
        currentFile.processed_path = task.result.download_url;
        
        console.log('=== MUSIC PROCESSING COMPLETED ===');
        console.log('Updated current file:', currentFile);
        console.log('New processed path:', currentFile.processed_path);
        console.log('Task result download URL:', task.result.download_url);
        
        showOutputResult(task);
        updateStepIndicator(3);
        
        // Hide processing overlay
        if (processingOverlay) {
            processingOverlay.classList.add('d-none');
        }

        // Update undo button state
        updateUndoButtonState();
        updateDownloadButtonState();
        
        // Ensure edit interface remains visible
        ensureEditInterfaceVisible();
        
        console.log('=== ADD MUSIC FUNCTION COMPLETED SUCCESSFULLY ===');

    } catch (error) {
        console.error('=== ADD MUSIC FUNCTION FAILED ===');
        console.error('Music addition failed:', error);
        console.error('Error stack:', error.stack);
        showMessage(`Music addition failed: ${error.message}`, 'danger');
        
        // Hide processing overlay on error
        if (processingOverlay) {
            processingOverlay.classList.add('d-none');
        }
    }
}

async function addBroll() {
    console.log('addBroll called');
    if (!validateCurrentFile()) return;
    
    const keywords = document.getElementById('input-broll-keywords').value || 'nature, city, people';
    
    // Show processing overlay
    const processingOverlay = document.getElementById('processingOverlay');
    if (processingOverlay) {
        processingOverlay.classList.remove('d-none');
    }
    
    try {
        console.log('Processing B-roll addition...');
        const response = await fetch(`${API_BASE}/process/${currentFile.file_id}/broll`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                params: {
                    filename: currentFile.filename,
                    keywords: keywords.split(',').map(k => k.trim())
                }
            })
        });

        const data = await response.json();
        console.log('B-roll processing response:', data);
        
        if (data.error) throw new Error(data.error);
        
        let task;
        do {
            await new Promise(r => setTimeout(r, 1000));
            const res = await fetch(`${API_BASE}/process/${data.task_id}/status`);
            task = await res.json();
            console.log('B-roll processing status:', task.status);
        } while (task.status === "processing");

        if (task.status === "failed") {
            throw new Error(task.error);
        }

        console.log('B-roll processing completed:', task);

        // Add to edit history AFTER processing
        addToEditHistory('Add B-roll', currentFile.file_id, currentFile.filename, { keywords: keywords });
        
        // Update current file with new processed path (but keep original file_id)
        currentFile.processed_path = task.result.download_url;
        
        showOutputResult(task);
        updateStepIndicator(3);
        
        // Hide processing overlay
        if (processingOverlay) {
            processingOverlay.classList.add('d-none');
        }

        // Update undo button state
        updateUndoButtonState();
        updateDownloadButtonState();
        
        // Ensure edit interface remains visible
        ensureEditInterfaceVisible();

    } catch (error) {
        console.error('B-roll addition failed:', error);
        showMessage(`B-roll addition failed: ${error.message}`, 'danger');
        
        // Hide processing overlay on error
        if (processingOverlay) {
            processingOverlay.classList.add('d-none');
        }
    }
}

// Update video player with processed video
function updateVideoPlayer(processedUrl) {
    const videoPlayer = document.getElementById('videoPlayer');
    console.log('updateVideoPlayer called with URL:', processedUrl);
    console.log('Video player element found:', !!videoPlayer);
    
    if (videoPlayer && processedUrl) {
        // The backend already returns URLs with /api prefix, so we need to handle this correctly
        let fullUrl;
        
        if (processedUrl.startsWith('/api/')) {
            // URL already has /api prefix, use as is
            fullUrl = processedUrl;
        } else if (processedUrl.startsWith('/')) {
            // URL starts with / but no /api, add API_BASE
            fullUrl = `${API_BASE}${processedUrl}`;
        } else {
            // Relative URL, add API_BASE
            fullUrl = `${API_BASE}/${processedUrl}`;
        }
        
        console.log('Setting video player source to:', fullUrl);
        
        // Force video player to refresh by clearing current source first
        videoPlayer.pause();
        videoPlayer.currentTime = 0;
        videoPlayer.src = '';
        videoPlayer.load();
        
        // Set new source with cache-busting parameter
        const cacheBuster = `?t=${Date.now()}`;
        videoPlayer.src = fullUrl + cacheBuster;
        videoPlayer.load();
        
        // Add event listeners to confirm video loads
        videoPlayer.onloadeddata = () => {
            console.log('Video data loaded successfully');
            console.log('Current video source:', videoPlayer.src);
        };
        
        videoPlayer.onerror = (e) => {
            console.error('Error loading video:', e);
            console.error('Video error details:', videoPlayer.error);
        };
        
        console.log('Video player updated with processed video:', fullUrl);
    } else {
        console.warn('Video player or processed URL not available:', {
            videoPlayer: !!videoPlayer,
            processedUrl: processedUrl
        });
    }
}

// Update showOutputResult to handle multiple output types
function showOutputResult(data) {
    const outputSection = document.getElementById('outputSection');
    console.log('=== SHOW OUTPUT RESULT CALLED ===');
    console.log('showOutputResult called with data:', data);
    console.log('Data structure:', {
        hasResult: !!data.result,
        hasDownloadUrl: !!(data.result && data.result.download_url),
        downloadUrl: data.result ? data.result.download_url : 'no result'
    });
    
    // Update video player with processed video
    if (data.result && data.result.download_url) {
        console.log('Updating video player with download URL:', data.result.download_url);
        console.log('URL analysis:', {
            startsWithSlash: data.result.download_url.startsWith('/'),
            startsWithApi: data.result.download_url.startsWith('/api/'),
            fullUrl: data.result.download_url
        });
        updateVideoPlayer(data.result.download_url);
    } else {
        console.warn('No download URL found in result data');
        console.warn('Full data object:', JSON.stringify(data, null, 2));
    }
    
    // Show success message but keep it minimal and dismissible
    outputSection.innerHTML = `
        <div class="alert alert-custom alert-success alert-dismissible fade show" role="alert">
            <div class="d-flex align-items-center">
                <i class="bi bi-check-circle-fill me-3 fs-4"></i>
                <div>
                    <h6 class="mb-1">Edit Applied Successfully!</h6>
                    <p class="mb-0 text-muted small">You can continue editing or download the current version.</p>
                </div>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    console.log('Success message displayed, ensuring edit interface remains visible...');
    
    // Explicitly ensure all edit sections remain visible and accessible
    const processingSteps = document.getElementById('processingSteps');
    if (processingSteps) {
        processingSteps.style.display = 'block';
        console.log('Processing steps section explicitly made visible');
    }
    
    // Keep the AI prompt area visible and ready for next use
    const aiPromptArea = document.querySelector('.ai-prompt-area');
    if (aiPromptArea) {
        aiPromptArea.style.display = 'block';
        console.log('AI prompt area explicitly made visible');
    }
    
    // Clear the AI prompt for next use
    const aiPromptInput = document.getElementById('input-ai-prompt');
    if (aiPromptInput) {
        aiPromptInput.value = '';
        console.log('AI prompt cleared for next use');
    }
    
    // Ensure all feature cards remain visible
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
        card.style.display = 'block';
    });
    console.log('All feature cards explicitly made visible');
    
    // Ensure the edit interface header is visible
    const editInterfaceHeader = document.querySelector('.bg-light.rounded-3.border-start');
    if (editInterfaceHeader) {
        editInterfaceHeader.style.display = 'block';
        console.log('Edit interface header explicitly made visible');
    }
    
    // Ensure action buttons section is visible
    const actionButtonsSection = document.getElementById('actionButtonsSection');
    if (actionButtonsSection) {
        actionButtonsSection.style.display = 'block';
        console.log('Action buttons section explicitly made visible');
    }
    
    // Update step indicator to show we're still in editing mode
    updateStepIndicator(2);
    console.log('Step indicator updated to editing mode');
    
    // Scroll to the edit interface to keep it in view
    setTimeout(() => {
        const processingStepsElement = document.getElementById('processingSteps');
        if (processingStepsElement) {
            processingStepsElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
            console.log('Scrolled to edit interface');
        }
    }, 500);
    
    console.log('Edit interface kept active for continued editing');
}

function showMessage(message, type = 'info') {
    const statusDiv = document.getElementById('uploadStatus');
    const alertClass = type === 'success' ? 'alert-success' : 
                      type === 'danger' ? 'alert-danger' : 
                      type === 'warning' ? 'alert-warning' : 'alert-info';
    
    statusDiv.innerHTML = `
        <div class="alert alert-custom ${alertClass} alert-dismissible fade show" role="alert">
            <i class="bi bi-${type === 'success' ? 'check-circle' : 
                             type === 'danger' ? 'exclamation-triangle' : 
                             type === 'warning' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
}

function validateCurrentFile() {
    if (!currentFile?.file_id) {
        showMessage('Please upload a video first', 'warning');
        return false;
    }
    return true;
}

async function runAiEdit() {
    console.log('runAiEdit called');
    if (!validateCurrentFile()) return;
    
    const prompt = document.getElementById('input-ai-prompt').value;
    if (!prompt.trim()) {
        showMessage('Please enter a prompt for AI editing', 'warning');
        return;
    }
    
    // Show processing overlay
    const processingOverlay = document.getElementById('processingOverlay');
    const spinner = document.getElementById('spinner-ai-edit');
    if (processingOverlay) {
        processingOverlay.classList.remove('d-none');
    }
    if (spinner) {
        spinner.style.display = 'block';
    }
    

    try {
    // Kick off the AI‑driven pipeline
    const res = await fetch(`${API_BASE}/process/ai-edit`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            file_id: currentFile.file_id,
            filename: currentFile.filename ?? null,
            music_file_id: musicData?.file_id ?? null,
            music_filename: musicData?.filename ?? null,
            user_input: prompt,
        })
        });
        if (!res.ok) throw new Error((await res.json()).detail || res.statusText);
        const data = await res.json();

    let task;
    do {
        await new Promise(r => setTimeout(r, 1000));
        const res = await fetch(`${API_BASE}/process/${data.task_id}/status`);
        task = await res.json();
    } while (task.status !== "completed" && task.status !== "failed");

    if (task.status === "failed") {
        // Hide processing overlay and spinner
        if (processingOverlay) {
            processingOverlay.classList.add('d-none');
        }
        if (spinner) {
            spinner.style.display = 'none';
        }
        const processingStepsElement = document.getElementById('processingSteps');
        if (processingStepsElement) {
            processingStepsElement.style.display = 'none';
        }
        throw new Error(task.error);
    }
    console.log('CHECK task', task);
    
    // Update current file with new processed path (but keep original file_id)
    currentFile.processed_path = task.result.download_url;
    
    showOutputResult(task);
    updateStepIndicator(3);

    showMessage('AI Edit pipeline completed!', 'success');
    
    // Add to edit history AFTER processing
    addToEditHistory('AI Edit', currentFile.file_id, currentFile.filename, { prompt: prompt });
    
    // Update undo button state
    updateUndoButtonState();
    updateDownloadButtonState();
    
    // Ensure edit interface remains visible
    ensureEditInterfaceVisible();
    
    } catch (err) {
        showMessage(`AI Edit failed: ${JSON.stringify(err.message)}`, 'danger');
    } finally {
        // hide spinner
        if (processingOverlay) {
            processingOverlay.classList.add('d-none');
        }
        if (spinner) {
            spinner.style.display = 'none';
        }
        // Don't hide processing steps - keep edit interface visible
        // document.getElementById('processingSteps').style.display = 'none';
    }
}

// Step indicator updates
function updateStepIndicator(step) {
    document.querySelectorAll('.step').forEach((s, index) => {
        if (index + 1 <= step) {
            s.classList.add('active');
        } else {
            s.classList.remove('active');
        }
    });
}

// Ensure edit interface remains visible
function ensureEditInterfaceVisible() {
    console.log('Ensuring edit interface remains visible...');
    
    // Ensure processing steps section is visible
    const processingSteps = document.getElementById('processingSteps');
    if (processingSteps) {
        processingSteps.style.display = 'block';
        console.log('Processing steps section made visible');
    }
    
    // Ensure AI prompt area is visible
    const aiPromptArea = document.querySelector('.ai-prompt-area');
    if (aiPromptArea) {
        aiPromptArea.style.display = 'block';
        console.log('AI prompt area made visible');
    }
    
    // Ensure all feature cards are visible
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
        card.style.display = 'block';
    });
    console.log('Feature cards made visible');
    
    // Ensure the edit interface header is visible
    const editInterfaceHeader = document.querySelector('.bg-light.rounded-3.border-start');
    if (editInterfaceHeader) {
        editInterfaceHeader.style.display = 'block';
        console.log('Edit interface header made visible');
    }
    
    // Ensure action buttons section is visible
    const actionButtonsSection = document.getElementById('actionButtonsSection');
    if (actionButtonsSection) {
        actionButtonsSection.style.display = 'block';
        console.log('Action buttons section made visible');
    }
    
    // Always hide edit history section - we don't want to show it
    const editHistorySection = document.getElementById('editHistorySection');
    if (editHistorySection) {
        editHistorySection.style.display = 'none';
        console.log('Edit history section kept hidden');
    }
    
    // Clear AI prompt for next use
    const aiPromptInput = document.getElementById('input-ai-prompt');
    if (aiPromptInput) {
        aiPromptInput.value = '';
        console.log('AI prompt cleared');
    }
    
    // Scroll to edit interface
    setTimeout(() => {
        const processingStepsElement = document.getElementById('processingSteps');
        if (processingStepsElement) {
            processingStepsElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
            console.log('Scrolled to edit interface');
        }
    }, 500);
    
    console.log('Edit interface visibility ensured');
}

// Add edit to history
function addToEditHistory(editType, fileId, filename, params = {}) {
    const edit = {
        id: Date.now(),
        type: editType,
        fileId: fileId,
        filename: filename,
        params: params,
        timestamp: new Date().toLocaleTimeString()
    };
    
    editHistory.push(edit);
    updateEditHistoryDisplay();
    console.log('Edit added to history:', edit);
}

// Update edit history display
function updateEditHistoryDisplay() {
    const editHistoryList = document.getElementById('editHistoryList');
    const editHistorySection = document.getElementById('editHistorySection');
    
    // Always hide edit history section - we don't want to show it
    if (editHistorySection) {
        editHistorySection.style.display = 'none';
    }
    
    // Still update the list content in case we need it later
    if (editHistoryList && editHistory.length > 0) {
        editHistoryList.innerHTML = editHistory.map(edit => `
            <div class="edit-history-item">
                <div>
                    <strong>${edit.type}</strong>
                    <small class="text-muted ms-2">${edit.timestamp}</small>
                    ${edit.params.prompt ? `<br><small class="text-muted">"${edit.params.prompt}"</small>` : ''}
                    ${edit.params.font_size ? `<br><small class="text-muted">Font size: ${edit.params.font_size}</small>` : ''}
                    ${edit.params.music_volume ? `<br><small class="text-muted">Music volume: ${edit.params.music_volume}</small>` : ''}
                    ${edit.params.keywords ? `<br><small class="text-muted">Keywords: ${edit.params.keywords}</small>` : ''}
                </div>
            </div>
        `).join('');
    }
}

// Update undo button state
function updateUndoButtonState() {
    const undoBtn = document.getElementById('btn-undo');
    if (undoBtn) {
        undoBtn.disabled = editHistory.length === 0;
    }
}

// Update download button state
function updateDownloadButtonState() {
    const downloadBtn = document.getElementById('btn-download');
    if (downloadBtn) {
        downloadBtn.disabled = !currentFile || !currentFile.processed_path;
    }
    
    // Also update header download button
    const headerDownloadBtn = document.getElementById('btn-download-header');
    if (headerDownloadBtn) {
        headerDownloadBtn.disabled = !currentFile || !currentFile.processed_path;
    }
}

// Update header download button state
function updateHeaderDownloadButtonState() {
    const headerDownloadBtn = document.getElementById('btn-download-header');
    if (headerDownloadBtn) {
        headerDownloadBtn.disabled = !currentFile || !currentFile.processed_path;
    }
}

// Undo last edit
async function undoLastEdit() {
    console.log('=== UNDO FUNCTION CALLED ===');
    console.log('Current edit history length:', editHistory.length);
    
    if (editHistory.length === 0) {
        showMessage('No edits to undo', 'warning');
        return;
    }
    
    const lastEdit = editHistory.pop();
    console.log('Undoing edit:', lastEdit);
    
    // For now, just reset to original video
    // This is a simple approach that works without complex state tracking
    currentFile.processed_path = null;
    
    // Show original video
    const videoPlayer = document.getElementById('videoPlayer');
    if (videoPlayer && currentFile.file_id && currentFile.filename) {
        const originalUrl = `${API_BASE}/files/download/${currentFile.file_id}/${currentFile.filename}`;
        videoPlayer.src = originalUrl;
        videoPlayer.load();
        console.log('Reverted to original video:', originalUrl);
    }
    
    // Update display
    updateEditHistoryDisplay();
    updateUndoButtonState();
    updateDownloadButtonState();
    updateHeaderDownloadButtonState();
    
    showMessage(`Undid: ${lastEdit.type}`, 'success');
    console.log('=== UNDO FUNCTION COMPLETED ===');
}

// Download video
function downloadVideo() {
    if (!currentFile || !currentFile.processed_path) {
        showMessage('No processed video available for download', 'warning');
        return;
    }
    
    // Handle URL construction correctly - backend already includes /api prefix
    let downloadUrl;
    if (currentFile.processed_path.startsWith('/api/')) {
        // URL already has /api prefix, use as is
        downloadUrl = currentFile.processed_path;
    } else if (currentFile.processed_path.startsWith('/')) {
        // URL starts with / but no /api, add API_BASE
        downloadUrl = `${API_BASE}${currentFile.processed_path}`;
    } else {
        // Relative URL, add API_BASE
        downloadUrl = `${API_BASE}/${currentFile.processed_path}`;
    }
    
    console.log('Download URL:', downloadUrl);
    
    // Create download link
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `processed_${currentFile.filename}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showMessage('Download started!', 'success');
}

// Function to attach event listeners to processing buttons
function attachProcessingButtonListeners() {
    console.log('Attaching processing button event listeners...');
    
    // Add direct event listeners to buttons
    const removeDuplicatesBtn = document.getElementById('btn-remove-duplicates');
    if (removeDuplicatesBtn) {
        // Remove existing listener if any
        removeDuplicatesBtn.removeEventListener('click', runRemoveDuplicates);
        removeDuplicatesBtn.addEventListener('click', function(e) {
            console.log('Remove duplicates button clicked via event listener');
            e.preventDefault();
            runRemoveDuplicates();
        });
        console.log('Remove duplicates button listener added');
    } else {
        console.error('Remove duplicates button not found');
    }

    const addCaptionsBtn = document.getElementById('btn-add-captions');
    if (addCaptionsBtn) {
        // Remove existing listener if any
        addCaptionsBtn.removeEventListener('click', addCaptions);
        addCaptionsBtn.addEventListener('click', function(e) {
            console.log('Add captions button clicked via event listener');
            e.preventDefault();
            addCaptions();
        });
        console.log('Add captions button listener added');
    } else {
        console.error('Add captions button not found');
    }

    const addMusicBtn = document.getElementById('btn-add-music');
    console.log('Music button element found:', !!addMusicBtn);
    if (addMusicBtn) {
        console.log('Adding click event listener to music button...');
        // Remove existing listener if any
        addMusicBtn.removeEventListener('click', addMusic);
        addMusicBtn.addEventListener('click', function(e) {
            console.log('=== MUSIC BUTTON CLICKED ===');
            console.log('Add music button clicked via event listener');
            console.log('Event:', e);
            e.preventDefault();
            console.log('Calling addMusic function...');
            addMusic();
        });
        console.log('Add music button listener added successfully');
    } else {
        console.error('Add music button not found - this is the problem!');
        console.error('Available buttons:', {
            removeDuplicates: !!document.getElementById('btn-remove-duplicates'),
            addCaptions: !!document.getElementById('btn-add-captions'),
            addMusic: !!document.getElementById('btn-add-music'),
            addBroll: !!document.getElementById('btn-add-broll'),
            runAiEdit: !!document.getElementById('btn-ai-edit')
        });
    }

    const addBrollBtn = document.getElementById('btn-add-broll');
    if (addBrollBtn) {
        // Remove existing listener if any
        addBrollBtn.removeEventListener('click', addBroll);
        addBrollBtn.addEventListener('click', function(e) {
            console.log('Add B-roll button clicked via event listener');
            e.preventDefault();
            addBroll();
        });
        console.log('Add B-roll button listener added');
    } else {
        console.error('Add B-roll button not found');
    }

    const runAiEditBtn = document.getElementById('btn-ai-edit');
    if (runAiEditBtn) {
        // Remove existing listener if any
        runAiEditBtn.removeEventListener('click', runAiEdit);
        runAiEditBtn.addEventListener('click', function(e) {
            console.log('Run AI Edit button clicked via event listener');
            e.preventDefault();
            runAiEdit();
        });
        console.log('Run AI Edit button listener added');
    } else {
        console.error('Run AI Edit button not found');
    }
    
    console.log('Processing button event listeners attached');
}
