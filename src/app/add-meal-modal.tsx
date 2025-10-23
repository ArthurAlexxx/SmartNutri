// src/components/add-meal-modal.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getNutritionalInfo } from '@/app/actions/meal-actions';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { MealData, MealEntry } from '@/types/meal';
import { ScrollArea } from './ui/scroll-area';


const foodItemSchema = z.object({
  name: z.string().min(1, 'O nome do alimento é obrigatório.'),
  portion: z.coerce.number().min(0.1, 'A porção deve ser maior que 0.'),
  unit: z.string().min(1, 'A unidade é obrigatória.'),
});

const formSchema = z.object({
  mealType: z.string().min(1, 'O tipo de refeição é obrigatório.'),
  foods: z.array(foodItemSchema).min(1, 'Adicione pelo menos um alimento.'),
});

type AddMealFormValues = z.infer<typeof formSchema>;

interface AddMealModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  userId: string;
}

export default function AddMealModal({ isOpen, onOpenChange, userId }: AddMealModalProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isProcessing, setIsProcessing] = useState(false);

  const form = useForm<AddMealFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mealType: '',
      foods: [{ name: '', portion: 100, unit: 'g' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'foods',
  });

  const onSubmit = async (data: AddMealFormValues) => {
    if (!firestore) {
      toast({ title: "Erro", description: "O serviço de banco de dados não está disponível.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    
    try {
      // 1. Chamar a Server Action para obter os dados nutricionais do n8n
      const result = await getNutritionalInfo(userId, data);
      
      if (result.error || !result.totals) {
        throw new Error(result.error || "Não foi possível calcular os dados nutricionais.");
      }
      
      // 2. Montar o objeto MealEntry completo com os dados retornados
      const mealData: MealData = {
        alimentos: data.foods.map(f => ({
          name: f.name,
          portion: f.portion,
          unit: f.unit,
          calorias: 0, 
          proteinas: 0, 
          carboidratos: 0, 
          gorduras: 0, 
          fibras: 0 
        })),
        totais: result.totals,
      };
      
      const newMealEntry: Omit<MealEntry, 'id'> = {
        userId: userId,
        date: new Intl.DateTimeFormat('sv-SE').format(new Date()), // YYYY-MM-DD
        mealType: data.mealType,
        mealData: mealData,
        createdAt: serverTimestamp(),
      };

      // 3. Salvar o objeto completo no Firestore do lado do cliente
      const mealEntriesRef = collection(firestore, 'meal_entries');
      await addDoc(mealEntriesRef, newMealEntry);

      // 4. Sucesso!
      toast({
          title: "Refeição Adicionada! ✅",
          description: "Sua refeição foi registrada com sucesso.",
      });
      form.reset({
        mealType: '',
        foods: [{ name: '', portion: 100, unit: 'g' }],
      });
      onOpenChange(false);

    } catch (error: any) {
      console.error("Erro ao adicionar refeição:", error);
      toast({
        title: "Erro ao Adicionar Refeição",
        description: error.message || "Ocorreu um erro desconhecido.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] shadow-2xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Adicionar Nova Refeição</DialogTitle>
          <DialogDescription>
            Descreva os alimentos da sua refeição para obter a análise nutricional.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="mealType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Tipo de Refeição *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar tipo de refeição" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cafe-da-manha">Café da Manhã</SelectItem>
                          <SelectItem value="almoco">Almoço</SelectItem>
                          <SelectItem value="jantar">Jantar</SelectItem>
                          <SelectItem value="lanche">Lanche</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Alimentos *</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({ name: '', portion: 100, unit: 'g' })}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {fields.map((field, index) => (
                      <div key={field.id} className="rounded-lg border p-4 space-y-4 relative bg-secondary/30">
                        <p className="font-semibold text-sm text-muted-foreground">Alimento {index + 1}</p>
                        {fields.length > 1 && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => remove(index)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                        <FormField
                          control={form.control}
                          name={`foods.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome do Alimento *</FormLabel>
                              <FormControl>
                                <Input placeholder="Ex: Peito de frango grelhado" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`foods.${index}.portion`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Porção *</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="Ex: 150" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`foods.${index}.unit`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Unidade *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecionar" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="g">g (gramas)</SelectItem>
                                    <SelectItem value="ml">ml (mililitros)</SelectItem>
                                    <SelectItem value="un">un (unidade)</SelectItem>
                                    <SelectItem value="fatia">fatia</SelectItem>
                                    <SelectItem value="xicara">xícara</SelectItem>
                                    <SelectItem value="colher-sopa">colher de sopa</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    ))}
                    <FormMessage>{form.formState.errors.foods?.message}</FormMessage>
                  </div>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="pt-4 gap-2 sm:gap-0 flex-col sm:flex-row">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isProcessing}>
                  {isProcessing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                  Adicionar Refeição
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
