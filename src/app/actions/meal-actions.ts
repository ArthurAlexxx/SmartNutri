
'use server';

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getLocalDateString } from '@/lib/date-utils';
import { Timestamp, addDoc, collection } from 'firebase/firestore';

// Securely initialize Firebase Admin SDK
if (!getApps().length) {
  // This environment variable is automatically set by Vercel when you add the integration.
  // For local development, you would set this in your .env.local file.
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    : undefined;

  initializeApp({
    credential: serviceAccount ? require('firebase-admin').credential.cert(serviceAccount) : undefined,
  });
}

const db = getFirestore();

interface FoodItem {
  name: string;
  portion: number;
  unit: string;
}

interface AddMealFormData {
  mealType: string;
  foods: FoodItem[];
}

export async function addMealEntry(userId: string, data: AddMealFormData) {
  if (!userId) {
    return { error: 'Usuário não autenticado.' };
  }
  if (!process.env.N8N_WEBHOOK_URL) {
    return { error: 'A URL do webhook de nutrição não está configurada.' };
  }

  const webhookUrl = process.env.N8N_WEBHOOK_URL;
    
  const combinedFoodString = data.foods
    .map(food => `${food.portion}${food.unit} de ${food.name}`)
    .join(' e ');

  try {
    const payload = {
      action: 'ref',
      alimento: combinedFoodString,
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`O webhook de nutrição retornou um erro: ${response.statusText}`);
    }

    const responseArray = await response.json();
    const rawOutput = responseArray[0]?.output;
    
    if (!rawOutput) {
       throw new Error('Formato de resposta do webhook inesperado.');
    }
    
    const jsonString = rawOutput.replace(/```json\n/g, "").replace(/\n```/g, "");
    const nutritionData = JSON.parse(jsonString);

    const mealDataResult = nutritionData.resultado;

    if (!mealDataResult) {
      throw new Error('O serviço não retornou informações para os alimentos informados. Verifique se os nomes estão corretos.');
    }

    const mealEntryData = {
      userId: userId,
      date: getLocalDateString(),
      mealType: data.mealType,
      mealData: {
        alimentos: data.foods.map(f => ({
          nome: f.name,
          porcao: f.portion,
          unidade: f.unit,
          calorias: 0,
          proteinas: 0,
          carboidratos: 0,
          gorduras: 0,
          fibras: 0,
        })),
        totais: {
          calorias: mealDataResult.calorias_kcal || 0,
          proteinas: mealDataResult.proteinas_g || 0,
          carboidratos: mealDataResult.carboidratos_g || 0,
          gorduras: mealDataResult.gorduras_g || 0,
          fibras: mealDataResult.fibras_g || 0,
        }
      },
      createdAt: Timestamp.now(),
    };

    const mealCollectionRef = collection(db, 'meal_entries');
    const docRef = await addDoc(mealCollectionRef, mealEntryData);

    const finalMealEntry = { ...mealEntryData, id: docRef.id };

    return { mealEntry: finalMealEntry };

  } catch (error: any) {
    console.error("Error in addMealEntry server action:", error);
    return { error: error.message || 'Ocorreu um erro desconhecido.' };
  }
}
