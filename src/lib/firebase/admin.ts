// src/lib/firebase/admin.ts
import * as admin from 'firebase-admin';

/**
 * Initializes the Firebase Admin SDK, ensuring it only runs once.
 * This function is designed to work in serverless environments like Vercel
 * by correctly parsing the service account key from environment variables.
 */
export function initializeAdminApp() {
    // If the app is already initialized, return the existing app.
    if (admin.apps.length > 0) {
        return admin.app();
    }

    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
        throw new Error('A variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY não está definida.');
    }

    try {
        let serviceAccountJson;
        try {
            // Standard parsing for a clean JSON string.
            serviceAccountJson = JSON.parse(serviceAccountKey);
        } catch (e) {
            // Fallback for double-escaped strings which can occur in some environments.
            serviceAccountJson = JSON.parse(JSON.parse(JSON.stringify(serviceAccountKey)));
        }

        // Vercel and other environments might escape newlines. This line fixes it.
        if (serviceAccountJson.private_key) {
            serviceAccountJson.private_key = serviceAccountJson.private_key.replace(/\\n/g, '\n');
        }

        // Initialize the app with the corrected credentials.
        return admin.initializeApp({
            credential: admin.credential.cert(serviceAccountJson),
        });

    } catch (error: any) {
        console.error("Falha Crítica ao inicializar o Firebase Admin SDK:", error.message);
        // Throw a more user-friendly error to be caught by server action callers.
        throw new Error("Erro de parsing na chave de serviço. Verifique o formato da variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY.");
    }
}
