let currentFile = null;
const API_BASE = "/api";
let musicData = null;

document.getElementById('videoUpload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    const preview = document.getElementById('videoPreviewContainer');
    const processingSteps = document.getElementById('processingSteps');
    const uploadStatus = document.getElementById('uploadStatus');

    try {
        // Reset UI
        currentFile = null;
        preview.style.display = 'none';
        processingSteps.style.display = 'none';
        uploadStatus.innerHTML = '';

        // Show preview
        const player = document.getElementById('videoPlayer');
        player.src = URL.createObjectURL(file);
        player.load();
        preview.style.display = 'block';

        // Upload file
        const data = await uploadFile(file, 'video');
        
        // Store references
        currentFile = {
            file_id: data.file_id,
            filename: data.filename,
            base_name: data.filename.split('.').slice(0, -1).join('.')
        };

        // Enable processing steps
        processingSteps.style.display = 'block';
        showMessage('Video uploaded successfully!', 'success');
    } catch (error) {
        e.target.value = ''; // Clear file input
        showMessage(`Video upload failed: ${error.message}`, 'danger');
    }
});

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
    // Show processing overlay and spinner
    document.getElementById('processingOverlay').classList.remove('d-none');
    document.getElementById('spinner-remove-duplicates').style.display = 'inline-block';
    

    try {
        const response = await fetch(`${API_BASE}/process/remove-duplicates`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                file_id: currentFile.file_id,
                params: {
                    filaname: currentFile.filename,
                    model: 'base',
                    dup_thresh: 0.85
                }
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        let task;
        do {
            await new Promise(r => setTimeout(r, 1000));
            const res = await fetch(`${API_BASE}/process/status/${data.task_id}`);
            task = await res.json();
        } while (task.status === "processing");

        if (task.status === "failed") {
            throw new Error(task.error);
        }

        showOutputResult(task);
        document.getElementById('processingOverlay').classList.add('d-none');
        document.getElementById('spinner-remove-duplicates').style.display = 'none';

    } catch (error) {
        showMessage(`Processing failed: ${error.message}`, 'danger');
        document.getElementById('processingOverlay').classList.add('d-none');
        document.getElementById('spinner-remove-duplicates').style.display = 'none';
    }
}

async function addCaptions() {
    // Show processing overlay and spinner
    document.getElementById('processingOverlay').classList.remove('d-none');
    document.getElementById('spinner-remove-duplicates').style.display = 'inline-block';
    
    const fontSize = document.getElementById('input-font-size').value || 28;
    
    try {
        const response = await fetch(`${API_BASE}/process/add-captions`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                file_id: currentFile.file_id,
                params: { font_size: fontSize }
            })
        });

        const data = await response.json();
        currentFile.processed_path = data.output_path;
        if (data.error) throw new Error(data.error);

        let task;
        do {
            await new Promise(r => setTimeout(r, 1000));
            const res = await fetch(`${API_BASE}/process/status/${data.task_id}`);
            task = await res.json();
        } while (task.status === "processing");

        if (task.status === "failed") {
            throw new Error(task.error);
        }

        showOutputResult(task);
        document.getElementById('processingOverlay').classList.add('d-none');
        document.getElementById('spinner-remove-duplicates').style.display = 'none';

    } catch (error) {
        showMessage(`Captioning failed: ${error.message}`, 'danger');
        document.getElementById('processingOverlay').classList.add('d-none');
        document.getElementById('spinner-remove-duplicates').style.display = 'none';
    }
}

async function addMusic() {
    const musicFileInput = document.getElementById('input-music-file');
    const musicVolume = parseFloat(document.getElementById('input-music-volume').value);
    

    // Show processing overlay and spinner
    document.getElementById('processingOverlay').classList.remove('d-none');
    document.getElementById('spinner-remove-duplicates').style.display = 'inline-block';
    
    try {
        if (!validateCurrentFile()) return;
        if (!musicFileInput.files?.[0]) {
            showMessage('Please select a music file', 'warning');
            document.getElementById('processingOverlay').classList.add('d-none');
            document.getElementById('spinner-remove-duplicates').style.display = 'none';
            return;
        }

        musicData = await uploadFile(musicFileInput.files[0], 'music');

        const response = await fetch(`${API_BASE}/process/music`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                file_id: currentFile.file_id,
                params: {
                    music_file_id: musicData.file_id,
                    music_filename: musicData.filename,
                    music_volume: musicVolume,
                }
            })
        });

        const data = await response.json();
        currentFile.processed_path = data.output_path;
        if (data.error) {
            document.getElementById('processingOverlay').classList.add('d-none');
            document.getElementById('spinner-remove-duplicates').style.display = 'none';
            throw new Error(data.error);
        }
        
        let task;
        do {
            await new Promise(r => setTimeout(r, 1000));
            const res = await fetch(`${API_BASE}/process/status/${data.task_id}`);
            task = await res.json();
        } while (task.status === "processing");

        if (task.status === "failed") {
            document.getElementById('processingOverlay').classList.add('d-none');
            document.getElementById('spinner-remove-duplicates').style.display = 'none';
            throw new Error(task.error);
        }

        showOutputResult(task);
        document.getElementById('processingOverlay').classList.add('d-none');
        document.getElementById('spinner-remove-duplicates').style.display = 'none';

    } catch (error) {
        showMessage(`Music addition failed: ${error.message}`, 'danger');
        document.getElementById('processingOverlay').classList.add('d-none');
        document.getElementById('spinner-remove-duplicates').style.display = 'none';
    }
}

async function addBroll() {
    // Show processing overlay and spinner
    document.getElementById('processingOverlay').classList.remove('d-none');
    document.getElementById('spinner-remove-duplicates').style.display = 'inline-block';
    
    const keywords = document.getElementById('input-broll-keywords').value;
    
    try {
        const response = await fetch(`${API_BASE}/process/broll`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                file_id: currentFile.file_id,
                params: {
                    keywords: keywords.split(',').map(k => k.trim())
                }
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error);
        
        let task;
        do {
            await new Promise(r => setTimeout(r, 1000));
            const res = await fetch(`${API_BASE}/process/status/${data.task_id}`);
            task = await res.json();
        } while (task.status === "processing");

        if (task.status === "failed") {
            throw new Error(task.error);
        }

        showOutputResult(task);
        document.getElementById('processingOverlay').classList.add('d-none');
        document.getElementById('spinner-remove-duplicates').style.display = 'none';

    } catch (error) {
        showMessage(`B-roll addition failed: ${error.message}`, 'danger');
        document.getElementById('processingOverlay').classList.add('d-none');
        document.getElementById('spinner-remove-duplicates').style.display = 'none';
    }
}

// Update showOutputResult to handle multiple output types
function showOutputResult(data) {
    const outputSection = document.getElementById('outputSection');
    console.log('data', data);
    const downloadUrl = data.result.download_url.startsWith('/') 
        ? data.result.download_url 
        : `${API_BASE}/${data.result.download_url}`;

    // Make sure the preview container is visible
    const previewContainer = document.getElementById('videoPreviewContainer');
    previewContainer.style.display = 'block';

    // Re-point the <video> element and reload
    const player = document.getElementById('videoPlayer');
    player.src = downloadUrl;
    player.load();

    outputSection.innerHTML = `
        <div class="alert alert-success">
            ${data.message || 'Processing complete!'} 
            <a href="${downloadUrl}" class="alert-link" download>
                Download ${data.output_type || 'processed video'}
            </a>
        </div>
    `;
}

function showMessage(message, type = 'info') {
    const statusDiv = document.getElementById('uploadStatus');
    statusDiv.innerHTML = `
        <div class="alert alert-${type}">${message}</div>
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
    if (!validateCurrentFile()) return;

    const prompt = document.getElementById('input-ai-prompt').value.trim();
    if (!prompt) {
        showMessage('Please enter an instruction for AI.', 'warning');
        return;
    }

    // Show spinner
    document.getElementById('spinner-ai-edit').style.display = 'inline-block';
    document.getElementById('processingOverlay').classList.remove('d-none');

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
        const { data } = await res.json();

    let task;
    do {
        await new Promise(r => setTimeout(r, 1000));
        const res = await fetch(`${API_BASE}/process/status/${data.task_id}`);
        task = await res.json();
    } while (task.status === "processing");

    if (task.status === "failed") {
        document.getElementById('processingOverlay').classList.add('d-none');
        document.getElementById('spinner-remove-duplicates').style.display = 'none';
        throw new Error(task.error);
    }

    showOutputResult(task);

    showMessage('AI Edit pipeline completed!', 'success');
    } catch (err) {
        showMessage(`AI Edit failed 2: ${JSON.stringify(err.message)}`, 'danger');
    } finally {
        // hide spinner
        document.getElementById('spinner-ai-edit').style.display = 'none';
        document.getElementById('processingOverlay').classList.add('d-none');
    }
}
