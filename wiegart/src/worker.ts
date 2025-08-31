// In a classic worker, we use importScripts to load external scripts.
// The path should be relative to the worker script's location.
try {
    importScripts('./lib/imagetracer.js');
} catch (e) {
    console.error("Failed to load ImageTracer:", e);
    // It might be beneficial to send an error message back to the main thread here
    // so the UI can reflect that the worker failed to initialize.
    (self as any).postMessage({ type: 'ERROR', message: 'Worker initialization failed.' });
}


// The ImageTracer library attaches itself to the global scope (self).
const ImageTracer = (self as any).ImageTracer;

self.onmessage = (e: MessageEvent) => {
    const { imageData, options } = e.data;

    // It's good practice to check if the library was loaded successfully.
    if (!ImageTracer) {
        (self as any).postMessage({ type: 'ERROR', message: 'ImageTracer not available.' });
        return;
    }

    try {
        // 1. Trace the image data to get the intermediate `tracedata` structure.
        const tracedata = ImageTracer.imagedataToTracedata(imageData, options);
        // 2. Generate the final SVG string from the `tracedata`.
        const svgstring = ImageTracer.getsvgstring(tracedata, options);
        // 3. Post both data structures back to the main thread.
        (self as any).postMessage({ type: 'SUCCESS', data: tracedata, svgstring: svgstring });
    } catch (error: any) {
        // Post an error message back to the main thread
        (self as any).postMessage({ type: 'ERROR', message: error.message });
    }
};
