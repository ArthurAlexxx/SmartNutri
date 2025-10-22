// src/app/actions/tenant-actions.ts
'use server';

import * as admin from 'firebase-admin';

function initializeAdminApp() {
    try {
        if (admin.apps.length > 0) {
            return { db: admin.firestore() };
        }
        
        const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (!serviceAccountKey) {
            throw new Error("A chave da conta de serviço do Firebase não foi encontrada nas variáveis de ambiente.");
        }

        // Parse a chave, corrigindo o formato da private_key
        const parsedKey = JSON.parse(serviceAccountKey);
        parsedKey.private_key = parsedKey.private_key.replace(/\\n/g, '\n');

        admin.initializeApp({
            credential: admin.credential.cert(parsedKey),
        });
        
        return { db: admin.firestore() };
    } catch (error: any) {
        console.error("Falha ao inicializar o Firebase Admin:", error.message);
        return { error: "Falha ao conectar com o serviço de banco de dados." };
    }
}

export async function deleteTenant(tenantId: string) {
    const { db, error: initError } = initializeAdminApp();
    if (initError) {
      return { success: false, error: initError };
    }

    const batch = db.batch();

    try {
        // 1. Get all professionals of the tenant
        const professionalsQuery = await db.collection('users').where('tenantId', '==', tenantId).where('profileType', '==', 'professional').get();
        const professionalIds = professionalsQuery.docs.map(doc => doc.id);

        // 2. Get all rooms of the professionals
        let allRoomIds: string[] = [];
        if (professionalIds.length > 0) {
            const roomsQuery = await db.collection('rooms').where('professionalId', 'in', professionalIds).get();
            allRoomIds = roomsQuery.docs.map(doc => doc.id);
        }

        // 3. Get all patients in those rooms
        const patientsQuery = await db.collection('users').where('patientRoomId', 'in', allRoomIds).get();
        const patientIds = patientsQuery.docs.map(doc => doc.id);

        // 4. Delete tenant document
        batch.delete(db.doc(`tenants/${tenantId}`));

        // 5. Delete site config
        batch.delete(db.doc(`tenants/${tenantId}/config/site`));
        
        // 6. Delete all professionals
        professionalIds.forEach(id => batch.delete(db.doc(`users/${id}`)));

        // 7. Delete all patients
        patientIds.forEach(id => batch.delete(db.doc(`users/${id}`)));

        // 8. Delete all rooms
        allRoomIds.forEach(id => batch.delete(db.doc(`rooms/${id}`)));

        await batch.commit();

        return { success: true };

    } catch (error: any) {
        console.error(`Erro ao deletar tenant ${tenantId}:`, error);
        return { success: false, error: error.message };
    }
}