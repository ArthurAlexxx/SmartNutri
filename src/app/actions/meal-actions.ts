// src/app/actions/meal-actions.ts
'use server';

import * as admin from 'firebase-admin';
import { getLocalDateString } from '@/lib/date-utils';
import { Timestamp } from 'firebase-admin/firestore';

interface FoodItem {
  name: string;
  portion: number;
  unit: string;
}

interface AddMealFormData {
  mealType: string;
  foods: FoodItem[];
}

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


export async function addMealEntry(userId: string, data: AddMealFormData) {
  if (!userId) {
    return { error: 'Usuário não autenticado.' };
  }

  const { db, error: initError } = initializeAdminApp();
  if (initError) {
      return { error: initError };
  }

  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    return { error: 'A URL do webhook de nutrição não está configurada.' };
  }

  const combinedFoodString = data.foods
    .map(food => `${food.portion}${food.unit} de ${food.name}`)
    .join(' e ');

  try {
    const payload = {
      action: 'ref',
      alimento: combinedFoodString,
      userId: userId,
      mealType: data.mealType,
      date: getLocalDateString(),
      foods: data.foods,
      createdAt: new Date().toISOString(),
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Webhook error response:", errorText);
        throw new Error(`O serviço de nutrição retornou um erro: ${response.statusText}`);
    }

    const responseData = await response.json();
    
    if (responseData && responseData.id) {
        const docRef = db.collection('meal_entries').doc(responseData.id);
        
        // Firestore admin SDK uses its own Timestamp object
        const finalMealEntry = {
            ...responseData,
            createdAt: Timestamp.fromDate(new Date(responseData.createdAt)),
        };

        // We use the admin SDK to write the data, as the webhook only returns it.
        await docRef.set(finalMealEntry);

        // We return a client-compatible version
        return { mealEntry: {
            ...finalMealEntry,
            createdAt: finalMealEntry.createdAt.toDate().toISOString()
        }};

    } else {
        throw new Error('Formato de resposta do webhook inesperado.');
    }

  } catch (error: any) {
    console.error("Error in addMealEntry server action:", error);
    return { error: error.message || 'Ocorreu um erro desconhecido ao contatar o serviço de nutrição.' };
  }
}
