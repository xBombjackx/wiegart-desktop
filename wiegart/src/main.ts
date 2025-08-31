import { invoke } from "@tauri-apps/api/core";

// DOM Element References
const dropZone = document.getElementById('drop-zone')!;
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const statusArea = document.getElementById('status-area')!;
const previewImage = document.getElementById('preview-image') as HTMLImageElement;
const statusMessage = document.getElementById('status-message')!;
const configArea = document.getElementById('config-area')!;
const colorSlider = document.getElementById('color-slider') as HTMLInputElement;
const colorCount = document.getElementById('color-count')!;
const saveButton = document.getElementById('save-button') as HTMLButtonElement;

// Application State
let vectorizedSvgString: string | null = null;

// --- Worker Setup ---
const worker = new Worker(new URL('./worker.ts', import.meta.url)/*, {
    type: 'module'
}*/);

worker.onmessage = (e: MessageEvent) => {
    const { type, svgstring, message } = e.data;
    if (type === 'SUCCESS') {
        vectorizedSvgString = svgstring;
        statusMessage.textContent = "Vectorization complete!";
        saveButton.disabled = false;
    } else if (type === 'ERROR') {
        statusMessage.textContent = `Error during vectorization: ${message}`;
        console.error("ImageTracer Worker Error:", message);
        saveButton.disabled = true;
    }
};

worker.onerror = (error: ErrorEvent) => {
    statusMessage.textContent = `An unexpected error occurred in the worker: ${error.message}`;
    console.error("Worker Error:", error);
    saveButton.disabled = true;
};

// --- Event Listeners ---

// Handle clicks on the drop zone to trigger the hidden file input
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
        handleFile(target.files[0]);
    }
});

// Drag and Drop Listeners
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault(); // Necessary to allow drop
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
    }
});

// Slider listener to re-process the image with a new color count
colorSlider.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    colorCount.textContent = target.value;
    // If a preview image has a source, it means an image is loaded and ready to be re-processed.
    if (previewImage.src) {
        processImage(previewImage);
    }
});

// Save button listener
saveButton.addEventListener('click', async () => {
    if (vectorizedSvgString) {
        statusMessage.textContent = "Preparing to save...";
        try {
            // The worker has already prepared the SVG string.

            // We just need to pass it to the backend. The backend expects camelCase.
            await invoke('save_svg', { svgContent: vectorizedSvgString });
            statusMessage.textContent = "SVG saved successfully!";
        } catch (error) {
            statusMessage.textContent = `Error saving file: ${error}`;
            console.error("Error invoking backend:", error);
        }
    }
});

// --- Core Logic Functions ---

/**
 * Handles the file once it's selected or dropped.
 * This function now uses the 'previewImage' element's own 'onload' event for reliability.
 */
function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
        statusMessage.textContent = "Please select an image file.";
        return;
    }

    // we can log the file name for debugging, but we don't need to store it
    console.log("Handling file:", file.name);
    statusMessage.textContent = "Loading image...";

    const reader = new FileReader();
    reader.onload = (e) => {
        const imageUrl = e.target!.result as string;

        previewImage.onload = () => {
            processImage(previewImage);
            previewImage.onload = null; // Clear handler after use
        };
        
        previewImage.src = imageUrl;
        statusArea.classList.remove('hidden');
        configArea.classList.remove('hidden');
    };
    reader.onerror = () => {
        statusMessage.textContent = "Error reading file.";
        console.error("FileReader error.");
    };
    reader.readAsDataURL(file);

    // Reset state for the new image
    saveButton.disabled = true;
    vectorizedSvgString = null;
}

/**
 * Processes the image using ImageTracer.js.
 * It now accepts the image element to process as an argument.
 */
function processImage(imageElement: HTMLImageElement) {
    if (!imageElement || !imageElement.src || imageElement.naturalWidth === 0) {
        statusMessage.textContent = "Image is not valid for processing.";
        console.error("processImage was called with an invalid or unloaded image.");
        return;
    }

    statusMessage.textContent = "Vectorizing image...";
    saveButton.disabled = true;
    vectorizedSvgString = null; // Reset SVG string when re-processing

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = imageElement.naturalWidth;
    canvas.height = imageElement.naturalHeight;
    ctx.drawImage(imageElement, 0, 0);

    const imageData = ctx.getImageData(0, 0, imageElement.naturalWidth, imageElement.naturalHeight);

    const options = {
        numberofcolors: parseInt(colorSlider.value, 10),
        ltres: 0.1,
        qtres: 0.1,
        pathomit: 0,
        roundcoords: 2
    };

    // Post the data to the worker
    worker.postMessage({ imageData, options });
}