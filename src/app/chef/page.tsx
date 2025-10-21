
// src/app/chef/page.tsx
'use client';

import { useState, useEffect, useCallback }from 'react';
import { collection, doc, onSnapshot, query, orderBy, addDoc, serverTimestamp, writeBatch, getDocs, Unsubscribe } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import AppLayout from '@/components/app-layout';
import { Loader2, ChefHat, Trash2 } from 'lucide-react';
import type { UserProfile } from '@/types/user';
import ChatView from '@/components/chat-view';
import { Message, initialMessages as defaultInitialMessages } from '@/components/chat-message';
import { chefVirtualFlow, type Recipe } from '@/ai/flows/chef-flow';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

const RecipeSchema = z.object({
  title: z.string(),
  description: z.string(),
  prepTime: z.string(),
  cookTime: z.string(),
  servings: z.string(),
  ingredients: z.array(z.string()),
  instructions: z.array(z.string()),
  nutrition: z.object({
    calories: z.string(),
    protein: z.string(),
    carbs: z.string(),
    fat: z.string(),
  }),
});

// Helper to parse the raw text from the flow
const parseResponse = (responseText: string): { text: string; recipe?: Recipe } => {
  try {
    // Attempt to parse the entire string as a direct JSON object (for recipes)
    const directJson = JSON.parse(responseText);
    const parsedRecipe = RecipeSchema.safeParse(directJson);
    if (parsedRecipe.success) {
      // It's a valid recipe object directly.
      return { text: '', recipe: parsedRecipe.data };
    }
    // It's some other JSON, maybe conversational output.
    if (directJson.output) {
      return { text: directJson.output };
    }
  } catch (e) {
    // Not a direct JSON object, so it might be a string with embedded JSON.
  }

  // Fallback for string-based responses (like from n8n webhook-test)
  let processedText = responseText;

  // Case 1: Response is an array like [{"output": "```json\n{...}\n```"}]
  try {
    const data = JSON.parse(responseText);
    if (Array.isArray(data) && data.length > 0 && data[0].output) {
      processedText = data[0].output;
    }
  } catch (e) {
    // Not a JSON array, proceed as plain text/JSON
  }

  // Case 2: The text (processed or original) contains a JSON block
  const jsonMatch = processedText.match(/```json\n([\s\S]*?)\n```/);
  if (jsonMatch && jsonMatch[1]) {
    try {
      const parsedJson = JSON.parse(jsonMatch[1]);
      const parsedRecipe = RecipeSchema.safeParse(parsedJson);
      if (parsedRecipe.success) {
        // Extract any text before the JSON block
        const textPart = processedText.substring(0, processedText.indexOf('```')).trim();
        return { text: textPart, recipe: parsedRecipe.data };
      }
    } catch (e) {
      // The JSON block is invalid, return the whole text
      return { text: processedText };
    }
  }

  // Case 3: The text is a simple JSON object (conversational output)
  try {
    const data = JSON.parse(responseText);
    if (data.output) {
      return { text: data.output };
    }
  } catch(e) {
    // Not a JSON, treat as plain text.
  }

  // Case 4: Fallback for pure text
  return { text: responseText };
};


export default function ChefPage() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isResponding, setIsResponding] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    let unsubProfile: Unsubscribe | undefined;
    let unsubMessages: Unsubscribe | undefined;

    if (firestore) {
      const userRef = doc(firestore, 'users', user.uid);
      unsubProfile = onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
          setUserProfile({ id: doc.id, ...doc.data() } as UserProfile);
        }
        setLoading(false);
      });

      const messagesRef = collection(firestore, 'users', user.uid, 'chef_messages');
      const q = query(messagesRef, orderBy('createdAt', 'asc'));
      
      unsubMessages = onSnapshot(q, (snapshot) => {
          if (snapshot.empty) {
              setMessages(defaultInitialMessages);
          } else {
              const loadedMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
              setMessages(loadedMessages);
          }
      }, (error) => {
          console.error("Error fetching chef messages:", error);
          const contextualError = new FirestorePermissionError({
              operation: 'list',
              path: `users/${'user.uid'}/chef_messages`,
          });
          errorEmitter.emit('permission-error', contextualError);
          setMessages(defaultInitialMessages); // Fallback to initial messages on error
      });
    }

    return () => {
      if (unsubProfile) unsubProfile();
      if (unsubMessages) unsubMessages();
    };
  }, [user, isUserLoading, router, firestore]);

  const handleProfileUpdate = useCallback((updatedProfile: Partial<UserProfile>) => {
    setUserProfile(prevProfile => prevProfile ? { ...prevProfile, ...updatedProfile } : null);
  }, []);

  const saveMessage = async (message: Omit<Message, 'id' | 'createdAt'>) => {
      if (!user || !firestore) return;
      const messagesRef = collection(firestore, 'users', user.uid, 'chef_messages');
      const messageData = {
          ...message,
          createdAt: serverTimestamp(),
      };
      
      try {
        await addDoc(messagesRef, messageData);
      } catch (error) {
        console.error('Failed to save message:', error);
        const contextualError = new FirestorePermissionError({
            operation: 'create',
            path: `users/${'user.uid'}/chef_messages`,
            requestResourceData: messageData,
        });
        errorEmitter.emit('permission-error', contextualError);
      }
  };

  const handleSendMessage = async (input: string) => {
      if (!input.trim() || !user) return;
      
      setIsResponding(true);

      const userMessage: Omit<Message, 'id' | 'createdAt'> = {
          role: 'user' as const,
          content: input,
      };
      await saveMessage(userMessage);

      try {
        const response = await chefVirtualFlow({ prompt: input, userId: user.uid });
        const { text, recipe } = parseResponse(response.text);
        
        const assistantMessage: Omit<Message, 'id' | 'createdAt'> = {
            role: 'assistant' as const,
            content: text || (recipe ? '' : "Não obtive uma resposta clara."),
            recipe: recipe || null,
        };
        await saveMessage(assistantMessage);

      } catch (error) {
          console.error("Failed to get AI response:", error);
          const errorMessage: Omit<Message, 'id' | 'createdAt'> = {
            role: 'assistant' as const,
            content: "Desculpe, não consegui processar sua solicitação. Por favor, tente novamente.",
          };
          await saveMessage(errorMessage);
          toast({
              title: "Erro de Comunicação",
              description: "Não foi possível conectar ao Chef. Verifique sua conexão ou tente mais tarde.",
              variant: "destructive"
          });
      } finally {
          setIsResponding(false);
      }
  };

  const handleClearChat = async () => {
    if (!user || !firestore) {
        toast({ title: "Erro", description: "Usuário não autenticado." });
        return;
    }
    const messagesRef = collection(firestore, 'users', user.uid, 'chef_messages');
    try {
        const snapshot = await getDocs(messagesRef);
        const batch = writeBatch(firestore);
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        toast({
            title: "Histórico Limpo",
            description: "A conversa com o Chef foi reiniciada."
        });
    } catch (error) {
        console.error("Error clearing chat history:", error);
        toast({
            title: "Erro ao Limpar",
            description: "Não foi possível limpar o histórico do chat.",
            variant: "destructive"
        });
    }
  }


  if (loading || isUserLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-muted/40 items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Carregando o Chef Virtual...</p>
      </div>
    );
  }

  return (
    <AppLayout
        user={user}
        userProfile={userProfile}
        onMealAdded={() => {}}
        onProfileUpdate={handleProfileUpdate}
    >
      <div className="flex flex-col h-full">
         <div className="container mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 text-center relative">
             <div className="inline-flex items-center justify-center bg-primary/10 text-primary rounded-full p-2 sm:p-3 mb-2 sm:mb-4">
                <ChefHat className="h-8 w-8 sm:h-10 sm:w-10" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground font-heading">Converse com seu Chef IA</h1>
            <p className="text-muted-foreground max-w-2xl mt-2 sm:mt-3 mx-auto">Peça receitas, dicas de culinária ou faça alterações nos pratos. Sua imaginação é o limite.</p>
            <Button
                variant="outline"
                size="icon"
                onClick={handleClearChat}
                className="absolute top-4 right-4 h-9 w-9"
                aria-label="Limpar histórico do chat"
            >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
        </div>

        <ChatView
          messages={messages}
          isResponding={isResponding}
          onSendMessage={handleSendMessage}
        />
      </div>
    </AppLayout>
  );
}
