
'use server';

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Helper function to initialize admin app securely
const initializeAdminApp = () => {
    // Check if the admin app is already initialized to avoid re-initialization
    const adminApp = getApps().find(app => app.name === 'admin');
    if (adminApp) {
        return { db: getFirestore(adminApp), error: null };
    }

    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountString) {
        const errorMessage = 'A chave da conta de serviço do Firebase não está configurada no ambiente.';
        console.error(errorMessage);
        return { db: null, error: errorMessage };
    }
    
    try {
        const serviceAccount = JSON.parse(serviceAccountString);
        const newAdminApp = initializeApp({
            credential: cert(serviceAccount)
        }, 'admin');
        return { db: getFirestore(newAdminApp), error: null };
    } catch (e: any) {
        const errorMessage = `Erro ao parsear ou inicializar a chave de serviço do Firebase: ${e.message}`;
        console.error(errorMessage);
        return { db: null, error: errorMessage };
    }
};


export async function deleteTenant(tenantId: string): Promise<{ success: boolean; error?: string }> {
  
  const { db, error: dbError } = initializeAdminApp();
  if (dbError || !db) {
      return { success: false, error: 'Falha ao conectar com o serviço de banco de dados.' };
  }

  try {
    const batch = db.batch();

    // 1. Delete the tenant document
    const tenantRef = db.collection('tenants').doc(tenantId);
    batch.delete(tenantRef);

    // 2. Delete subcollections (config, products, prices, etc.)
    const siteConfigRef = db.collection('tenants').doc(tenantId).collection('config').doc('site');
    batch.delete(siteConfigRef);
    
    const templatesQuery = db.collection('tenants').doc(tenantId).collection('plan_templates');
    const templatesSnapshot = await templatesQuery.get();
    templatesSnapshot.forEach(doc => batch.delete(doc.ref));

    const guidelinesQuery = db.collection('tenants').doc(tenantId).collection('guidelines');
    const guidelinesSnapshot = await guidelinesQuery.get();
    guidelinesSnapshot.forEach(doc => batch.delete(doc.ref));

    const productsQuery = db.collection('tenants').doc(tenantId).collection('products');
    const productsSnapshot = await productsQuery.get();
    for (const productDoc of productsSnapshot.docs) {
        const pricesQuery = productDoc.ref.collection('prices');
        const pricesSnapshot = await pricesQuery.get();
        pricesSnapshot.forEach(priceDoc => batch.delete(priceDoc.ref));
        batch.delete(productDoc.ref);
    }

    // 3. Find and delete all users belonging to this tenant
    const usersQuery = db.collection('users').where('tenantId', '==', tenantId);
    const usersSnapshot = await usersQuery.get();
    usersSnapshot.forEach(doc => {
      batch.delete(doc.ref);
      // NOTE: This does not delete the user from Firebase Authentication.
      // A production app would need a Cloud Function to do that for full cleanup.
    });

    // 4. Find and delete all rooms belonging to this tenant
    const roomsQuery = db.collection('rooms').where('tenantId', '==', tenantId);
    const roomsSnapshot = await roomsQuery.get();
    roomsSnapshot.forEach(doc => batch.delete(doc.ref));

    await batch.commit();
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting tenant:", error);
    return { success: false, error: error.message || "Ocorreu um erro desconhecido." };
  }
}
