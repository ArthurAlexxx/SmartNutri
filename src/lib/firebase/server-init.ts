// src/lib/firebase/server-init.ts
import * as admin from 'firebase-admin';

/**
 * Initializes the Firebase Admin SDK for server-side operations, ensuring it only runs once.
 * This is crucial for environments like serverless functions where code can be re-initialized.
 */
function initializeAdminApp() {
    // Check if the app is already initialized to prevent errors
    if (admin.apps.length > 0) {
        return admin.app();
    }

    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
        throw new Error('A variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY não está definida.');
    }

    try {
        const serviceAccountJson = JSON.parse(serviceAccountKey);
        
        // Firebase Admin SDK's private_key needs actual newlines.
        if (serviceAccountJson.private_key) {
            serviceAccountJson.private_key = serviceAccountJson.private_key.replace(/\\n/g, '\n');
        }

        return admin.initializeApp({
            credential: admin.credential.cert(serviceAccountJson),
        });
    } catch (error: any) {
        console.error("Critical Failure initializing Firebase Admin SDK:", error.message);
        throw new Error("Erro de parsing na chave de serviço. Verifique o formato da variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY.");
    }
}

// Initialize the app
const adminApp = initializeAdminApp();

// Export initialized services for use in server-side code
export const db = admin.firestore();
export const auth = admin.auth();
export const adminSDK = admin;
