import { invoke } from '@tauri-apps/api/core';

self.onmessage = async (e: MessageEvent) => {
    const { imageData, tempImagePath, palette } = e.data;

    if (!imageData || !tempImagePath || !palette) {
        (self as any).postMessage({ type: 'ERROR', message: 'Worker received invalid data.' });
        return;
    }

    const svgLayers = [];

    try {
        for (const color of palette) {
            try {
                // Call the new Rust command for each color
                const svgPathData = await invoke('trace_with_potrace', {
                    imagePath: tempImagePath,
                    color: color.hex,
                });

                if (typeof svgPathData === 'string' && svgPathData.length > 0) {
                    // Create an SVG layer from the returned path data
                    const layer = `<path d="${svgPathData}" fill="${color.hex}" />`;
                    svgLayers.push(layer);
                }

            } catch (error) {
                console.error(`Error tracing color ${color.hex}:`, error);
                // Optionally, you could decide to continue or to fail the whole process
                // For now, we'll log and continue
            }
        }

        // Assemble the final SVG
        const finalSvg = `<svg width="${imageData.width}" height="${imageData.height}" xmlns="http://www.w3.org/2000/svg">${svgLayers.join('')}</svg>`;
        (self as any).postMessage({ type: 'SUCCESS', svgstring: finalSvg });

    } catch (error: any) {
        (self as any).postMessage({ type: 'ERROR', message: error.message || 'An unknown error occurred in the worker.' });
    }
};
