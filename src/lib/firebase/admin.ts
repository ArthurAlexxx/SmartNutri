
// src/lib/firebase/admin.ts
import * as admin from 'firebase-admin';

/**
 * Initializes the Firebase Admin SDK, ensuring it only runs once.
 * This function is designed to work in serverless environments like Vercel
 * by correctly parsing the service account key from environment variables.
 */
export async function initializeAdminApp() {
    // If the app is already initialized, do nothing.
    if (admin.apps.length > 0) {
        return;
    }

    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
        throw new Error('A variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY não está definida.');
    }

    try {
        let serviceAccountJson;
        try {
            // First, try to parse it directly. This works if the env var is a clean JSON.
            serviceAccountJson = JSON.parse(serviceAccountKey);
        } catch (e) {
            // If that fails, it might be a double-escaped string. Parse it again.
            // This is a common issue in some environments.
            serviceAccountJson = JSON.parse(JSON.parse(JSON.stringify(serviceAccountKey)));
        }

        // Vercel and other environments might escape newlines. This line fixes it.
        if (serviceAccountJson.private_key) {
            serviceAccountJson.private_key = serviceAccountJson.private_key.replace(/\\n/g, '\n');
        }

        // Initialize the app with the corrected credentials
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccountJson),
        });

    } catch (error: any) {
        console.error("Falha Crítica ao inicializar o Firebase Admin SDK:", error);
        throw new Error("Erro de parsing na chave de serviço. Verifique o formato da variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY.");
    }
}

export { admin };
