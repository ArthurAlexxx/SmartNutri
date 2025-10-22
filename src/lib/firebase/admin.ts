
// src/lib/firebase/admin.ts
import * as admin from 'firebase-admin';

// Função para inicializar o Firebase Admin SDK
export function initializeAdminApp() {
    if (admin.apps.length > 0) {
        return { adminApp: admin.apps[0], initError: null };
    }

    try {
        const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (!serviceAccountKey) {
            throw new Error("A variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY não está definida.");
        }

        // Substituir \\n por \n na chave privada
        const parsedServiceAccount = JSON.parse(serviceAccountKey);
        parsedServiceAccount.private_key = parsedServiceAccount.private_key.replace(/\\n/g, '\n');

        const adminApp = admin.initializeApp({
            credential: admin.credential.cert(parsedServiceAccount),
        });

        return { adminApp, initError: null };
    } catch (error: any) {
        return { adminApp: null, initError: error.message };
    }
}

export { admin };
