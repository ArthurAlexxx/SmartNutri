// src/app/actions/tenant-actions.ts
'use server';

import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

/**
 * Initializes the Firebase Admin SDK, ensuring it only runs once per serverless function instance.
 * This is now self-contained within the actions file to ensure environment variables are available.
 */
function initializeAdminApp() {
    if (admin.apps.length > 0) {
        return admin.app();
    }

    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
        throw new Error('A variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY não está definida.');
    }

    try {
        const serviceAccountJson = JSON.parse(serviceAccountKey);
        
        // Correctly format the private key by replacing escaped newlines.
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


/**
 * Deleta um tenant e todos os dados associados.
 * @param tenantId O ID do tenant a ser deletado.
 */
export async function deleteTenant(tenantId: string): Promise<{ success: boolean; error?: string }> {
    try {
        initializeAdminApp();
        const db = getFirestore();
        const auth = getAuth();

        const batch = db.batch();

        // 1. Encontrar todos os profissionais e pacientes do tenant
        const usersQuery = await db.collection('users').where('tenantId', '==', tenantId).get();
        const userIdsToDelete: string[] = [];

        usersQuery.forEach(doc => {
            userIdsToDelete.push(doc.id);
            batch.delete(doc.ref); // Deletar perfil do usuário
        });

        // 2. Deletar usuários da Autenticação
        if (userIdsToDelete.length > 0) {
            await auth.deleteUsers(userIdsToDelete);
        }

        // 3. Deletar coleções do tenant (plan_templates, guidelines, etc.)
        const templatesRef = db.collection('tenants').doc(tenantId).collection('plan_templates');
        const templatesSnapshot = await templatesRef.get();
        templatesSnapshot.forEach(doc => batch.delete(doc.ref));

        const guidelinesRef = db.collection('tenants').doc(tenantId).collection('guidelines');
        const guidelinesSnapshot = await guidelinesRef.get();
        guidelinesSnapshot.forEach(doc => batch.delete(doc.ref));
        
        const siteConfigRef = db.collection('tenants').doc(tenantId).collection('config').doc('site');
        batch.delete(siteConfigRef);

        // 4. Deletar o documento do tenant
        const tenantRef = db.collection('tenants').doc(tenantId);
        batch.delete(tenantRef);

        // 5. Commit all deletions
        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Erro ao deletar tenant:", error);
        return { success: false, error: error.message || 'Ocorreu um erro desconhecido.' };
    }
}


/**
 * Deleta um usuário e todos os seus dados associados no Firestore e na Autenticação.
 * @param userId O ID do usuário a ser deletado.
 */
export async function deleteUserAndData(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
        initializeAdminApp();
        const db = getFirestore();
        const auth = getAuth();

        const batch = db.batch();

        // 1. Deletar entradas de refeição (meal_entries)
        const mealsQuery = await db.collection('meal_entries').where('userId', '==', userId).get();
        mealsQuery.forEach(doc => batch.delete(doc.ref));

        // 2. Deletar entradas de hidratação (hydration_entries)
        const hydrationQuery = await db.collection('hydration_entries').where('userId', '==', userId).get();
        hydrationQuery.forEach(doc => batch.delete(doc.ref));

        // 3. Deletar logs de peso (weight_logs)
        const weightQuery = await db.collection('weight_logs').where('userId', '==', userId).get();
        weightQuery.forEach(doc => batch.delete(doc.ref));

        // 4. Deletar o perfil do usuário (users)
        const userRef = db.collection('users').doc(userId);
        batch.delete(userRef);

        // Commit all Firestore deletions
        await batch.commit();

        // 5. Deletar o usuário da Autenticação
        await auth.deleteUser(userId);

        return { success: true };
    } catch (error: any)
    {
        console.error("Erro ao deletar usuário e seus dados:", error);
        return { success: false, error: error.message || 'Ocorreu um erro desconhecido ao deletar o usuário.' };
    }
}
