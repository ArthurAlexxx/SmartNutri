// src/components/pro/plan-editor.tsx
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { type Room } from '@/types/room';
import { type UserProfile } from '@/types/user';
import { type PlanTemplate } from '@/types/library';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus, Save, Trash2, Utensils, Droplet, Flame, RotateCcw, Sparkles, BrainCircuit, Rocket, Library, Download } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useFirestore } from '@/firebase';
import { doc, runTransaction, serverTimestamp, arrayUnion, getDoc, updateDoc, Timestamp, arrayRemove, collection, query, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Separator } from '../ui/separator';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import AIPlanConfirmationModal from '../ai-plan-confirmation-modal';

const mealPlanItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'O tipo de refeição é obrigatório.'),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM).'),
  items: z.string().min(3, 'Descreva os itens da refeição.'),
});

const formSchema = z.object({
  calorieGoal: z.coerce.number().positive('A meta de calorias deve ser positiva.'),
  proteinGoal: z.coerce.number().positive('A meta de proteínas deve ser positiva.'),
  hydrationGoal: z.coerce.number().positive('A meta de hidratação deve ser positiva.'),
  meals: z.array(mealPlanItemSchema).min(0, 'Adicione pelo menos uma refeição ao plano.'),
});

type PlanEditorFormValues = z.infer<typeof formSchema>;

interface PlanEditorProps {
  room?: Room;
  userProfile?: UserProfile;
}

const defaultMealValues: Omit<z.infer<typeof mealPlanItemSchema>, 'id'> = { name: '', time: '00:00', items: '' };

const mealTypeOptions = [
    { value: 'Café da Manhã', label: 'Café da Manhã' },
    { value: 'Lanche da Manhã', label: 'Lanche da Manhã' },
    { value: 'Almoço', label: 'Almoço' },
    { value: 'Lanche da Tarde', label: 'Lanche da Tarde' },
    { value: 'Jantar', label: 'Jantar' },
    { value: 'Ceia', label: 'Ceia' },
];

export default function PlanEditor({ room, userProfile }: PlanEditorProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const isProfessionalMode = !!room;
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAIModalOpen, setAIModalOpen] = useState(false);
  const [planTemplates, setPlanTemplates] = useState<PlanTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const activePlan = isProfessionalMode ? room.activePlan : userProfile?.activePlan;
  
  const calculatedProteinGoal = (calories: number) => Math.round((calories * 0.35) / 4);

  const initialGoals = {
    calorieGoal: activePlan?.calorieGoal || userProfile?.calorieGoal || 2000,
    proteinGoal: activePlan?.proteinGoal || userProfile?.proteinGoal || calculatedProteinGoal(activePlan?.calorieGoal || userProfile?.calorieGoal || 2000),
    hydrationGoal: activePlan?.hydrationGoal || userProfile?.waterGoal || 2000,
  };


  const form = useForm<PlanEditorFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      calorieGoal: initialGoals.calorieGoal,
      proteinGoal: initialGoals.proteinGoal,
      hydrationGoal: initialGoals.hydrationGoal,
      meals: activePlan?.meals && activePlan.meals.length > 0 ? activePlan.meals : [],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: 'meals',
  });
  
  useEffect(() => {
    if (activePlan) {
      form.reset({
        calorieGoal: activePlan.calorieGoal,
        proteinGoal: activePlan.proteinGoal || calculatedProteinGoal(activePlan.calorieGoal),
        hydrationGoal: activePlan.hydrationGoal,
        meals: activePlan.meals || [],
      });
    }
  }, [activePlan, form]);


  const watchedCalorieGoal = form.watch('calorieGoal');

  useEffect(() => {
      const isCalorieGoalDirty = form.formState.dirtyFields.calorieGoal;
      if (watchedCalorieGoal > 0 && isCalorieGoalDirty) {
          const newProteinGoal = calculatedProteinGoal(watchedCalorieGoal);
          form.setValue('proteinGoal', newProteinGoal, { shouldDirty: true });
      }
  }, [watchedCalorieGoal, form]);

  useEffect(() => {
    if (!isProfessionalMode || !userProfile?.tenantId || !firestore) return;

    const templatesQuery = query(collection(firestore, 'tenants', userProfile.tenantId, 'plan_templates'));
    const unsubscribe = onSnapshot(templatesQuery, snapshot => {
      setPlanTemplates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlanTemplate)));
    });

    return () => unsubscribe();
  }, [isProfessionalMode, userProfile?.tenantId, firestore]);


  const { isSubmitting, isDirty } = form.formState;

  const onSubmit = async (data: PlanEditorFormValues) => {
    if (isProfessionalMode && room) {
        await handleProfessionalSubmit(data);
    } else if (userProfile) {
        await handlePatientSubmit(data);
    }
  };

  const handlePatientSubmit = async (data: PlanEditorFormValues) => {
    if (!userProfile?.id || !firestore) return;
    
    try {
        const userRef = doc(firestore, 'users', userProfile.id);
        const newActivePlan = {
            ...data,
            createdAt: serverTimestamp(),
        };

        await updateDoc(userRef, {
            activePlan: newActivePlan,
            calorieGoal: data.calorieGoal,
            proteinGoal: data.proteinGoal,
            waterGoal: data.hydrationGoal,
        });

        toast({
            title: "Plano Salvo!",
            description: `Seu plano alimentar pessoal foi salvo com sucesso.`,
        });
        form.reset(data);

    } catch (error: any) {
         toast({
            title: "Erro ao Salvar",
            description: error.message || "Não foi possível salvar seu plano.",
            variant: "destructive",
        });
    }
  }
  
  const handleProfessionalSubmit = async (data: PlanEditorFormValues) => {
     if(!room || !firestore) return;
     try {
        const roomRef = doc(firestore, 'rooms', room.id);
        await runTransaction(firestore, async (transaction) => {
            const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists()) {
              throw new Error("Sala não encontrada.");
            }
            const roomData = roomDoc.data();
            if (roomData.professionalId !== room.professionalId) {
                throw new Error("Você não tem permissão para atualizar esta sala.");
            }

            const oldPlan = roomData.activePlan;
            const updatedActivePlan = {
              ...data,
              createdAt: serverTimestamp(),
            };

            transaction.update(roomRef, {
              activePlan: updatedActivePlan,
              planHistory: arrayUnion(oldPlan),
            });
        });

        toast({
            title: "Plano Atualizado!",
            description: `O plano de ${room.patientInfo.name} foi salvo com sucesso.`,
        });
        form.reset(data);
    } catch(error: any) {
        toast({
            title: "Erro ao atualizar",
            description: error.message || "Não foi possível salvar o plano.",
            variant: "destructive",
        });
    }
  };
  
    const handleRemoveMeal = (index: number) => {
    if (!firestore) return;
    
    // Create a copy of the current meal field to be potentially re-added on error.
    const mealToRemove = { ...fields[index] };
    
    // Optimistically remove from UI
    remove(index);

    const dataToSave = form.getValues();
    const newMeals = dataToSave.meals.filter((_, i) => i !== index);
    const newData = {...dataToSave, meals: newMeals };

    // Non-blocking update
    if (isProfessionalMode && room) {
        const roomRef = doc(firestore, 'rooms', room.id);
        updateDoc(roomRef, { 'activePlan.meals': newMeals }).catch(error => {
            append(mealToRemove, { shouldFocus: false }); // Rollback on error
            toast({ title: "Erro", description: "Não foi possível remover a refeição." });
        });
    } else if (!isProfessionalMode && userProfile) {
        const userRef = doc(firestore, 'users', userProfile.id);
        updateDoc(userRef, { 'activePlan.meals': newMeals }).catch(error => {
            append(mealToRemove, { shouldFocus: false }); // Rollback on error
            toast({ title: "Erro", description: "Não foi possível remover a refeição." });
        });
    }

    toast({
        title: "Refeição Removida",
        description: "A refeição foi removida do seu plano.",
    });
  };

  const handleClearPlan = async () => {
    if (!isProfessionalMode || !room || !firestore) return;
    try {
        const roomRef = doc(firestore, 'rooms', room.id);
        
        await runTransaction(firestore, async (transaction) => {
            const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists()) throw new Error("Sala não encontrada.");
            const roomData = roomDoc.data();
            if (!roomData) throw new Error("Dados da sala não encontrados.");

            const patientRef = doc(firestore, 'users', roomData.patientId);
            const patientDoc = await transaction.get(patientRef);
            if (!patientDoc.exists()) throw new Error("Paciente não encontrado.");
            const patientData = patientDoc.data();
            const oldPlan = roomData.activePlan;
            
            const newActivePlan = {
              meals: [],
              calorieGoal: patientData?.calorieGoal || 2000,
              proteinGoal: patientData?.proteinGoal || 140,
              hydrationGoal: patientData?.waterGoal || 2000,
              createdAt: serverTimestamp(),
            };

            transaction.update(roomRef, {
                activePlan: newActivePlan,
                planHistory: arrayUnion(oldPlan),
            });
        });
        
        form.reset({
            calorieGoal: (form.getValues('calorieGoal')),
            proteinGoal: (form.getValues('proteinGoal')),
            hydrationGoal: (form.getValues('hydrationGoal')),
            meals: [],
        });

        toast({
            title: "Plano Limpo!",
            description: "O plano alimentar foi removido. O paciente voltará a usar suas metas pessoais.",
        });

    } catch (error: any) {
        toast({
            title: "Erro ao Limpar Plano",
            description: error.message || "Não foi possível remover o plano.",
            variant: "destructive",
        });
    }
  };

  const handleConfirmAIPlan = async () => {
    setAIModalOpen(false);
    setIsGenerating(true);
    toast({
        title: "Gerando seu plano...",
        description: "Aguarde enquanto a IA prepara um plano alimentar personalizado."
    });

    const webhookUrl = 'https://n8n.srv1061126.hstgr.cloud/webhook/881ba59f-a34a-43e9-891e-483ec8f7b1ef';
    
    try {
        const aiData = getAIData();
        const formValues = form.getValues();
        const dirtyFields = form.formState.dirtyFields;
        
        const payload = {
            action: 'plan',
            user: {
                id: isProfessionalMode ? room?.patientId : userProfile?.id,
                calorieGoal: dirtyFields.calorieGoal ? formValues.calorieGoal : null,
                proteinGoal: dirtyFields.proteinGoal ? formValues.proteinGoal : null,
                hydrationGoal: formValues.hydrationGoal,
                weight: aiData.weight,
                targetWeight: aiData.targetWeight,
                targetDate: aiData.targetDate ? aiData.targetDate.toISOString().split('T')[0] : undefined,
            }
        };

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`O webhook retornou um erro: ${response.statusText}. Detalhes: ${errorText}`);
        }
        
        const responseData = await response.json();
        
        // Handle the nested structure: [{ "output": "```json\n{...}\n```" }]
        let rawPlanJson;
        if (Array.isArray(responseData) && responseData.length > 0 && responseData[0].output) {
            rawPlanJson = responseData[0].output.replace(/```json\n/g, "").replace(/\n```/g, "");
        } else {
            throw new Error('Formato de resposta da IA inesperado.');
        }

        const generatedPlan = JSON.parse(rawPlanJson);

        // Validar e preencher o formulário
        const parsedPlan = formSchema.safeParse(generatedPlan);

        if (parsedPlan.success) {
            const data = parsedPlan.data;
            await onSubmit(data); // This will save the plan
            
            toast({
                title: "Plano Gerado e Salvo!",
                description: "O novo plano foi criado e salvo no seu perfil.",
            });
        } else {
             console.error("Zod validation error:", parsedPlan.error);
             throw new Error('Os dados retornados pela IA não estão no formato correto.');
        }

    } catch (error: any) {
        console.error("Erro ao gerar plano com IA:", error);
        toast({
            title: "Erro na Geração do Plano",
            description: error.message || "Não foi possível gerar o plano. Tente novamente.",
            variant: "destructive",
        });
    } finally {
        setIsGenerating(false);
    }
  };

  const getAIData = () => {
    const targetDataSource = isProfessionalMode ? room?.patientInfo : userProfile;
    const targetDate = targetDataSource?.targetDate;

    let finalDate: Date | undefined;
    if (targetDate) {
        // Se for um timestamp do Firebase, converta. Se já for Date, use diretamente.
        if (typeof (targetDate as any)?.toDate === 'function') {
            finalDate = (targetDate as Timestamp).toDate();
        } else if (targetDate instanceof Date) {
            finalDate = targetDate;
        }
    }

    return {
        weight: targetDataSource?.weight,
        targetWeight: targetDataSource?.targetWeight,
        targetDate: finalDate,
    };
  };

    const handleApplyTemplate = () => {
        if (!selectedTemplate) return;
        const template = planTemplates.find(t => t.id === selectedTemplate);
        if (!template) return;

        form.setValue('calorieGoal', template.calorieGoal, { shouldDirty: true });
        form.setValue('proteinGoal', calculatedProteinGoal(template.calorieGoal), { shouldDirty: true });
        form.setValue('hydrationGoal', template.hydrationGoal, { shouldDirty: true });
        form.setValue('meals', template.meals, { shouldDirty: true });

        toast({
            title: "Modelo Aplicado!",
            description: `O modelo "${template.name}" foi carregado no editor.`,
        });
    };

  return (
    <>
    <div className="animate-fade-in max-w-7xl mx-auto">
        <div className="mb-6 px-0">
            <h3 className="text-2xl font-bold">{isProfessionalMode ? "Editor de Plano Alimentar" : "Meu Plano Alimentar"}</h3>
            <p className="text-muted-foreground">
                {isProfessionalMode 
                    ? "Modifique as metas e as refeições do paciente. As alterações serão salvas e o plano antigo será movido para o histórico."
                    : "Crie seu próprio plano ou deixe que nossa IA crie um para você."
                }
            </p>
        </div>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                 <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-8 lg:sticky lg:top-8">
                        
                         {isProfessionalMode ? (
                             <Card className="shadow-sm">
                                <CardHeader>
                                     <div className="flex items-center gap-3">
                                        <div className="flex-shrink-0 bg-primary/10 text-primary p-3 rounded-full">
                                            <Library className="h-6 w-6" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-lg font-semibold text-foreground">Carregar Modelo</h3>
                                            <p className="text-sm text-muted-foreground">Poupe tempo aplicando um plano da sua biblioteca.</p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <Select onValueChange={setSelectedTemplate} disabled={planTemplates.length === 0}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione um modelo..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {planTemplates.map(template => (
                                                <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                     <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                             <Button type="button" className="w-full" disabled={!selectedTemplate}>
                                                <Download className="mr-2 h-4 w-4" /> Carregar Modelo
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Confirmar Ação</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Isso substituirá o plano atual não salvo pelas informações do modelo selecionado. Deseja continuar?
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleApplyTemplate}>Continuar</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </CardContent>
                             </Card>
                         ) : (
                            <Card className="shadow-sm">
                                <CardHeader>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-shrink-0 bg-primary/10 text-primary p-3 rounded-full">
                                            <BrainCircuit className="h-6 w-6" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-lg font-semibold text-foreground">Plano com IA</h3>
                                            <p className="text-sm text-muted-foreground">Deixe a IA criar um plano com base nas suas metas.</p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <Button type="button" onClick={() => setAIModalOpen(true)} disabled={isGenerating} className="w-full">
                                        {isGenerating ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Sparkles className="mr-2 h-4 w-4" />
                                        )}
                                        Gerar Plano Inteligente
                                    </Button>
                                </CardContent>
                            </Card>
                         )}
                        
                        <Card className="shadow-sm">
                            <CardHeader>
                                <h3 className="text-lg font-semibold text-foreground">Metas Diárias</h3>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <FormField control={form.control} name="calorieGoal" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className='flex items-center gap-2 text-xs'><Flame className='h-4 w-4 text-orange-500'/> Calorias *</FormLabel>
                                        <FormControl><Input type="number" {...field} /></FormControl><FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="proteinGoal" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className='flex items-center gap-2 text-xs'><Rocket className='h-4 w-4 text-blue-500'/> Proteínas *</FormLabel>
                                        <FormControl><Input type="number" {...field} /></FormControl><FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="hydrationGoal" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className='flex items-center gap-2 text-xs'><Droplet className='h-4 w-4 text-sky-500'/> Hidratação *</FormLabel>
                                        <FormControl><Input type="number" {...field} /></FormControl><FormMessage />
                                    </FormItem>
                                )}/>
                            </CardContent>
                        </Card>

                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-3">
                        <Card className="shadow-sm">
                             <CardHeader>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2"><Utensils className='h-5 w-5' /> Refeições do Plano</h3>
                                    <Button type="button" variant="outline" size="sm" onClick={() => append(defaultMealValues)}><Plus className="mr-2 h-4 w-4" /> Nova Refeição</Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {fields.length === 0 ? (
                                    <div className="text-center py-12 px-4 rounded-lg border-2 border-dashed min-h-[200px] flex flex-col justify-center items-center">
                                        <p className="font-medium text-muted-foreground">Nenhuma refeição adicionada.</p>
                                        <p className="text-sm text-muted-foreground mt-1">Clique em "Nova Refeição" ou use a IA para começar.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {fields.map((field, index) => (
                                            <div key={field.id} className="rounded-lg border p-4 space-y-4 relative bg-background">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <FormField control={form.control} name={`meals.${index}.name`} render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Tipo de Refeição *</FormLabel>
                                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                <FormControl>
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Selecione um tipo" />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    {mealTypeOptions.map(option => (
                                                                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}/>
                                                    <FormField control={form.control} name={`meals.${index}.time`} render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Horário *</FormLabel>
                                                            <FormControl><Input type="time" {...field} /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}/>
                                                </div>
                                                <FormField control={form.control} name={`meals.${index}.items`} render={({ field }) => (
                                                    <FormItem><FormLabel>Itens da Refeição *</FormLabel><FormControl><Textarea placeholder="Ex: 2 ovos, 1 fatia de pão integral com abacate..." {...field} rows={3} /></FormControl><FormMessage /></FormItem>
                                                )}/>
                                                {fields.length > 0 && (
                                                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveMeal(index)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                        {form.formState.errors.meals?.root && <FormMessage>{form.formState.errors.meals.root.message}</FormMessage>}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className='flex flex-col-reverse sm:flex-row sm:justify-end sm:items-center gap-4 mt-8'>
                    {isProfessionalMode && (
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                 <Button type="button" variant="destructive" className="mr-auto">
                                    <RotateCcw className="mr-2 h-4 w-4" /> Limpar Plano
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta ação removerá todas as refeições do plano ativo e reverterá as metas de calorias e hidratação para as definidas pelo paciente. O plano atual será salvo no histórico.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleClearPlan} className="bg-destructive hover:bg-destructive/90">Confirmar Limpeza</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                    
                    <Button type="submit" disabled={isSubmitting || !isDirty}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Salvar Alterações
                    </Button>
                </div>
            </form>
        </Form>
    </div>
    <AIPlanConfirmationModal
        isOpen={isAIModalOpen}
        onOpenChange={setAIModalOpen}
        onConfirm={handleConfirmAIPlan}
        data={getAIData()}
        isLoading={isGenerating}
        form={form}
    />
    </>
  );
}
