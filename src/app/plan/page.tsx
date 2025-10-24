
// src/app/plan/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { doc, onSnapshot, Unsubscribe, updateDoc, Timestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/app-layout';
import { Loader2, MessageSquare } from 'lucide-react';
import type { UserProfile } from '@/types/user';
import type { Room } from '@/types/room';
import MealPlanView from '@/components/meal-plan-view';
import { ChatRoom } from '@/components/chat-room';
import PlanEditor from '@/components/pro/plan-editor';
import { useUser, useFirestore } from '@/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

export default function PlanPage() {
  const { user, userProfile, isUserLoading, onProfileUpdate } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (isUserLoading || !firestore) return;
    if (!user) {
      router.push('/login');
      return;
    }

    let unsubRoom: Unsubscribe | undefined;

    // We depend on the userProfile from the useUser hook, which is already live
    if (userProfile) {
        if (userProfile.patientRoomId) {
            const roomRef = doc(firestore, 'rooms', userProfile.patientRoomId);
            unsubRoom = onSnapshot(roomRef, (roomDoc) => {
              if (roomDoc.exists()) {
                setRoom({ id: roomDoc.id, ...roomDoc.data() } as Room);
              } else {
                setRoom(null); // Room was deleted
              }
              setLoading(false);
            }, () => {
              // Error fetching room
              setLoading(false);
            });
        } else {
            // No room, not an error
            setRoom(null);
            setLoading(false);
        }
    } else {
        // Profile is still loading or doesn't exist
        setLoading(isUserLoading);
    }

    return () => {
      if (unsubRoom) unsubRoom();
    };
  }, [user, userProfile, isUserLoading, router, firestore]);

  const hasUnreadMessages = useMemo(() => {
    if (!room || !user) return false;
    const lastMessage = room.lastMessage;
    const lastReadTimestamp = room.lastRead?.[user.uid];

    if (!lastMessage || lastMessage.senderId === user.uid) return false;
    if (!lastReadTimestamp) return true; // No read timestamp means everything is unread
    
    // lastMessage.createdAt can be a server timestamp which is not a date yet on client
    // so we check for toDate method
    const lastMessageDate = lastMessage.createdAt?.toDate ? lastMessage.createdAt.toDate() : new Date();
    return lastMessageDate > lastReadTimestamp.toDate();
  }, [room, user]);

  const handleChatOpen = (isOpen: boolean) => {
    setChatOpen(isOpen);
    if (isOpen && user && room && hasUnreadMessages && firestore) {
      const roomRef = doc(firestore, 'rooms', room.id);
      updateDoc(roomRef, {
        [`lastRead.${user.uid}`]: Timestamp.now()
      });
    }
  }


  if (loading || isUserLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-muted/40 items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Carregando seus planos...</p>
      </div>
    );
  }
  
  const isUserWithProfessional = !!userProfile?.patientRoomId && room;

  return (
    <AppLayout
        user={user}
        userProfile={userProfile}
        onProfileUpdate={onProfileUpdate}
    >
       <Sheet open={isChatOpen} onOpenChange={handleChatOpen}>
        <div className="flex flex-col gap-8">
            <div className='animate-fade-in flex flex-col sm:flex-row items-center justify-between text-center sm:text-left gap-4'>
                <div className="flex-1">
                    <h2 className='text-3xl font-bold text-foreground font-heading'>
                        Meus Planos Alimentares
                    </h2>
                    <p className='text-muted-foreground mt-1 max-w-2xl mx-auto sm:mx-0'>
                        Gerencie seu plano pessoal e visualize o plano criado pelo seu nutricionista.
                    </p>
                </div>
                {isUserWithProfessional && (
                     <SheetTrigger asChild>
                        <Button variant="outline" className="relative">
                            <MessageSquare className="mr-2 h-4 w-4"/>
                            Chat com Nutricionista
                            {hasUnreadMessages && (
                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                </span>
                            )}
                        </Button>
                    </SheetTrigger>
                )}
            </div>
            
            <Tabs defaultValue="personal" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="personal">Meu Plano Pessoal / IA</TabsTrigger>
                    <TabsTrigger value="pro" disabled={!isUserWithProfessional}>Plano do Nutricionista</TabsTrigger>
                </TabsList>

                <TabsContent value="personal" className="mt-6">
                    <PlanEditor userProfile={userProfile || undefined} />
                </TabsContent>

                <TabsContent value="pro" className="mt-6">
                    {isUserWithProfessional ? (
                        <MealPlanView room={room} />
                    ) : (
                        <Card>
                            <CardHeader>
                                <CardTitle>Plano do Nutricionista</CardTitle>
                                <CardDescription>Nenhum plano de nutricionista encontrado.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">Para visualizar um plano aqui, você precisa estar conectado a um profissional através do código de compartilhamento.</p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
        <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
            <SheetHeader className="p-6 border-b">
              <SheetTitle>Chat com Nutricionista</SheetTitle>
              <SheetDescription>
                Converse em tempo real para tirar dúvidas e fazer ajustes.
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 min-h-0">
                 {room && user && userProfile && (
                     <ChatRoom 
                        roomId={room.id}
                        currentUser={{
                            uid: user.uid,
                            name: userProfile?.fullName || 'Paciente',
                        }}
                        isProfessional={false}
                    />
                )}
            </div>
        </SheetContent>
        </Sheet>
    </AppLayout>
  );
}
