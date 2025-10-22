// src/app/actions/meal-actions.ts
'use server';

import { getLocalDateString } from '@/lib/date-utils';
import { v4 as uuidv4 } from 'uuid';
import * as admin from 'firebase-admin';

// Função para inicializar o Firebase Admin SDK de forma segura
function initializeAdminApp() {
    try {
        // Se já houver um app inicializado, use-o.
        if (admin.apps.length > 0) {
            return { db: admin.firestore() };
        }
        
        const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (!serviceAccountKey) {
            throw new Error("A chave da conta de serviço do Firebase não foi encontrada nas variáveis de ambiente.");
        }

        // Parse da chave, garantindo que a private_key seja formatada corretamente
        const parsedKey = JSON.parse(serviceAccountKey);
        parsedKey.private_key = parsedKey.private_key.replace(/\\n/g, '\n');

        admin.initializeApp({
            credential: admin.credential.cert(parsedKey),
        });
        
        return { db: admin.firestore() };
    } catch (error: any) {
        console.error("Falha ao inicializar o Firebase Admin:", error.message);
        // Retorna um objeto de erro claro para ser tratado pela função que chama
        return { error: "Falha ao conectar com o serviço de banco de dados." };
    }
}

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

  // A inicialização agora acontece dentro da action
  const { db, error: initError } = initializeAdminApp();
  if (initError) {
    // Se a inicialização falhar, retorne o erro.
    return { error: initError };
  }

  const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
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
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Webhook error response:", errorText);
        throw new Error(`O serviço de nutrição retornou um erro: ${errorText || response.statusText}`);
    }

    const responseData = await response.json();
    const nestedOutput = JSON.parse(responseData[0].output);
    const nutritionData = nestedOutput.resultado;

    if (!nutritionData) {
      throw new Error('Formato de resposta de nutrição inesperado do webhook.');
    }

    const mealId = uuidv4();
    const mealEntry = {
      id: mealId,
      userId: userId,
      date: getLocalDateString(),
      mealType: data.mealType,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      mealData: {
        alimentos: data.foods.map(f => ({ nome: f.name, porcao: f.portion, unidade: f.unit, calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0, fibras: 0 })),
        totais: {
          calorias: nutritionData.calorias_kcal || 0,
          proteinas: nutritionData.proteinas_g || 0,
          carboidratos: nutritionData.carboidratos_g || 0,
          gorduras: nutritionData.gorduras_g || 0,
          fibras: nutritionData.fibras_g || 0,
        },
      },
    };
    
    // Salva a refeição no Firestore
    const mealRef = db.collection('meal_entries').doc(mealId);
    await mealRef.set(mealEntry);

    return { success: true };

  } catch (error: any) {
    console.error("Error in addMealEntry server action:", error);
    return { error: error.message || 'Ocorreu um erro desconhecido ao contatar o serviço de nutrição.' };
  }
}
