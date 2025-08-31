import { invoke } from "@tauri-apps/api/core";
import { writeBinaryFile } from '@tauri-apps/plugin-fs';
import { appCacheDir, join } from '@tauri-apps/api/path';
import quantize from 'quantize';

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
const worker = new Worker(new URL('./worker.ts', import.meta.url));

worker.onmessage = (e: MessageEvent) => {
    const { type, svgstring, message } = e.data;
    if (type === 'SUCCESS') {
        vectorizedSvgString = svgstring;
        statusMessage.textContent = "Vectorization complete!";
        saveButton.disabled = false;
        // Display the vectorized image
        const blob = new Blob([svgstring], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        previewImage.src = url;

    } else if (type === 'ERROR') {
        statusMessage.textContent = `Error during vectorization: ${message}`;
        console.error("Worker Error:", message);
        saveButton.disabled = true;
    }
};

worker.onerror = (error: ErrorEvent) => {
    statusMessage.textContent = `An unexpected error occurred in the worker: ${error.message}`;
    console.error("Worker Error:", error);
    saveButton.disabled = true;
};

// --- Event Listeners ---

dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
        handleFile(target.files[0]);
    }
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
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

colorSlider.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    colorCount.textContent = target.value;
    if (previewImage.dataset.originalSrc) {
        // Create a temporary image object to re-process
        const tempImage = new Image();
        tempImage.onload = () => processImage(tempImage);
        tempImage.src = previewImage.dataset.originalSrc;
    }
});

saveButton.addEventListener('click', async () => {
    if (vectorizedSvgString) {
        statusMessage.textContent = "Preparing to save...";
        try {
            await invoke('save_svg', { svgContent: vectorizedSvgString });
            statusMessage.textContent = "SVG saved successfully!";
        } catch (error) {
            statusMessage.textContent = `Error saving file: ${error}`;
            console.error("Error invoking backend:", error);
        }
    }
});

// --- Core Logic Functions ---

function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
        statusMessage.textContent = "Please select an image file.";
        return;
    }

    statusMessage.textContent = "Loading image...";
    const reader = new FileReader();
    reader.onload = (e) => {
        const imageUrl = e.target!.result as string;
        previewImage.dataset.originalSrc = imageUrl; // Store original source

        previewImage.onload = () => {
            processImage(previewImage);
            previewImage.onload = null; // Clear handler
        };

        previewImage.src = imageUrl;
        statusArea.classList.remove('hidden');
        configArea.classList.remove('hidden');
    };
    reader.onerror = () => {
        statusMessage.textContent = "Error reading file.";
    };
    reader.readAsDataURL(file);

    saveButton.disabled = true;
    vectorizedSvgString = null;
}

async function processImage(imageElement: HTMLImageElement) {
    if (!imageElement || !imageElement.src || imageElement.naturalWidth === 0) {
        statusMessage.textContent = "Image is not valid for processing.";
        return;
    }

    statusMessage.textContent = "Quantizing and vectorizing...";
    saveButton.disabled = true;
    vectorizedSvgString = null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    canvas.width = imageElement.naturalWidth;
    canvas.height = imageElement.naturalHeight;
    ctx.drawImage(imageElement, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixelArray = getPixelArray(imageData);

    const colorMap = quantize(pixelArray, parseInt(colorSlider.value, 10));
    if (!colorMap) {
        statusMessage.textContent = "Error: Could not create color palette.";
        return;
    }
    const palette = colorMap.palette().map((rgb: number[]) => ({
        rgb: rgb,
        hex: `#${rgb.map(c => c.toString(16).padStart(2, '0')).join('')}`
    }));

    const quantizedImageData = createQuantizedImageData(imageData, palette);

    // Draw quantized image to a new canvas to get PNG data
    const quantizedCanvas = document.createElement('canvas');
    quantizedCanvas.width = quantizedImageData.width;
    quantizedCanvas.height = quantizedImageData.height;
    const quantizedCtx = quantizedCanvas.getContext('2d')!;
    quantizedCtx.putImageData(quantizedImageData, 0, 0);

    // Get data URL and convert to binary
    const dataUrl = quantizedCanvas.toDataURL('image/png');
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const binaryData = await new Response(blob).arrayBuffer();

    const cacheDir = await appCacheDir();
    const tempImagePath = await join(cacheDir, 'temp_quantized.png');

    await writeBinaryFile(tempImagePath, new Uint8Array(binaryData));

    worker.postMessage({
        imageData: { width: imageData.width, height: imageData.height },
        tempImagePath: tempImagePath, // Pass the absolute path
        palette,
    });
}

function getPixelArray(imageData: ImageData): [number, number, number][] {
    const pixels: [number, number, number][] = [];
    for (let i = 0; i < imageData.data.length; i += 4) {
        // Ignore transparent pixels
        if (imageData.data[i + 3] > 128) {
            pixels.push([imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]]);
        }
    }
    return pixels;
}

function createQuantizedImageData(originalData: ImageData, palette: { rgb: number[] }[]): ImageData {
    const quantizedData = new Uint8ClampedArray(originalData.data.length);
    const originalPixels = originalData.data;

    for (let i = 0; i < originalPixels.length; i += 4) {
        if (originalPixels[i + 3] === 0) { // Preserve transparency
            quantizedData[i] = 0;
            quantizedData[i + 1] = 0;
            quantizedData[i + 2] = 0;
            quantizedData[i + 3] = 0;
            continue;
        }

        const closestColor = findClosestColor(
            [originalPixels[i], originalPixels[i + 1], originalPixels[i + 2]],
            palette
        );
        quantizedData[i] = closestColor[0];
        quantizedData[i + 1] = closestColor[1];
        quantizedData[i + 2] = closestColor[2];
        quantizedData[i + 3] = 255;
    }
    return new ImageData(quantizedData, originalData.width, originalData.height);
}

function findClosestColor(pixel: number[], palette: { rgb: number[] }[]): number[] {
    let closestDistance = Infinity;
    let closestColor = palette[0].rgb;
    for (const color of palette) {
        const distance = Math.sqrt(
            Math.pow(pixel[0] - color.rgb[0], 2) +
            Math.pow(pixel[1] - color.rgb[1], 2) +
            Math.pow(pixel[2] - color.rgb[2], 2)
        );
        if (distance < closestDistance) {
            closestDistance = distance;
            closestColor = color.rgb;
        }
    }
    return closestColor;
}