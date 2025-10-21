
// src/app/actions/tenant-actions.ts
'use server';

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, collection, query, where, getDocs, writeBatch } from 'firebase-admin/firestore';

// Securely initialize Firebase Admin SDK
if (!getApps().length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    : undefined;

  initializeApp({
    credential: serviceAccount ? cert(serviceAccount) : undefined,
  });
}

const db = getFirestore();

export async function deleteTenant(tenantId: string): Promise<{ success: boolean; error?: string }> {
  if (!db) {
    return { success: false, error: "A conexão com o banco de dados não foi estabelecida." };
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
