const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

// Import the ESM app using dynamic import
let app;

// Create the export for Firebase
exports.app = onRequest(async (req, res) => {
    if (!app) {
        // Dynamic import of the existing ESM app
        // We need to point to the file in the parent directory or copy it in.
        // However, Firebase deployment uploads the 'functions' folder. 
        // We should probably structure this so the app code is inside 'functions' or copied there during deploy.
        // For simplicity, we will assume we import a local adaptation if we can't link to parent.
        // BUT, typical setup is to have the code inside functions.
        // Let's rely on the user copying proxy.mjs and config.mjs to functions/ or we will symlink/copy it now.

        // Actually, simpler approach:
        // We will create a local proxy.mjs inside functions that imports the logic.
        // But since we can't easily reach "../proxy.mjs" in deployed environment securely without proper packaging,
        // we will rewrite the adapter to be self-contained or copy the files.

        // Let's try to import the ../proxy.mjs if we package it.
        // Node: ../proxy.mjs might not be available after deploy if we only deploy 'functions' folder.
        // Best practice: The 'functions' folder should contain all server code.

        // We will define the app logic here or import it if we move the files.
        // For now, I will write a minimal adapter that assumes the 'proxy.mjs' and 'config.mjs' 
        // are COPIED into 'functions' before deploy or during install.

        const module = await import("./proxy.mjs");
        app = module.app;
    }
    return app(req, res);
});
