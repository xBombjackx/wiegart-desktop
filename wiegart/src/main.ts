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
let vectorizedData: any = null;
let originalFile: File | null = null;
// The global 'imageObject' is no longer needed, we will use the previewImage element directly.

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
    if (vectorizedData) {
        statusMessage.textContent = "Preparing to save...";
        const svgString = assembleSvgString(vectorizedData);
        try {
            await invoke('save_svg', { svg_content: svgString });
            statusMessage.textContent = "SVG saved successfully!";
        } catch (error) {
            statusMessage.textContent = "Error saving file.";
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
    originalFile = file;
    statusMessage.textContent = "Loading image...";

    const reader = new FileReader();
    reader.onload = (e) => {
        const imageUrl = e.target!.result as string;

        // Set up the onload event for the VISIBLE preview image.
        // This will fire once the image data is loaded into the element.
        previewImage.onload = () => {
            // Now that the preview image is fully loaded, process it.
            processImage(previewImage);
            // Clear the onload handler to prevent it from firing again accidentally.
            previewImage.onload = null;
        };
        
        // Set the src of the preview image. This triggers the loading process.
        previewImage.src = imageUrl;
        
        statusArea.classList.remove('hidden');
        configArea.classList.remove('hidden');
    };
    reader.readAsDataURL(file);

    // Reset state for the new image
    saveButton.disabled = true;
    vectorizedData = null;
}

/**
 * Processes the image using ImageTracer.js.
 * It now accepts the image element to process as an argument.
 */
function processImage(imageElement: HTMLImageElement) {
    // Check if the image is valid and loaded
    if (!imageElement || !imageElement.src || imageElement.naturalWidth === 0) {
        console.error("processImage was called with an invalid or unloaded image.");
        return;
    }
    
    statusMessage.textContent = "Vectorizing image...";
    saveButton.disabled = true;

    // Use a timeout to allow the UI to update before the CPU-intensive tracing operation
    setTimeout(() => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        // Use naturalWidth/Height to get the original image dimensions
        canvas.width = imageElement.naturalWidth;
        canvas.height = imageElement.naturalHeight;

        ctx.drawImage(imageElement, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, imageElement.naturalWidth, imageElement.naturalHeight);

        const options = {
            numberofcolors: parseInt(colorSlider.value, 10),
            ltres: 1, qtres: 1, pathomit: 8
        };
        
        (window as any).ImageTracer.imagedataToTracedata(imageData, (tracedata: any) => {
            vectorizedData = tracedata;
            statusMessage.textContent = "Vectorization complete!";
            saveButton.disabled = false; // Enable the save button
        }, options);
    }, 100);
}

/**
 * Assembles the final SVG string from tracedata.
 */
function assembleSvgString(data: any): string {
    const { width, height, layers, palette } = data;
    let svgString = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;

    layers.forEach((layer: any[], layerIndex: number) => {
        const color = palette[layerIndex];
        const fillColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
        svgString += `<g fill="${fillColor}">`;
        layer.forEach(path => {
            let pathString = '';
            path.forEach((segment: any[]) => {
                pathString += `M ${segment[0][0]} ${segment[0][1]} `;
                for (let i = 1; i < segment.length; i++) {
                    pathString += `L ${segment[i][0]} ${segment[i][1]} `;
                }
                pathString += 'Z ';
            });
            svgString += `<path d="${pathString}" />`;
        });
        svgString += `</g>`;
    });

    svgString += `</svg>`;
    return svgString;
}