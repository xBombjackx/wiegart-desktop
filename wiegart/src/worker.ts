// Since this is a worker, we can't use modules in the same way.
// We need to import the script into the worker's global scope.
importScripts('/src/lib/imagetracer.js');

// The ImageTracer library attaches itself to the global scope (self).
const ImageTracer = (self as any).ImageTracer;

self.onmessage = (e: MessageEvent) => {
    const { imageData, options } = e.data;

    try {
        const tracedata = ImageTracer.imagedataToTracedata(imageData, options);
        // Post the tracedata back to the main thread
        (self as any).postMessage({ type: 'SUCCESS', data: tracedata });
    } catch (error) {
        // Post an error message back to the main thread
        (self as any).postMessage({ type: 'ERROR', message: error.message });
    }
};
