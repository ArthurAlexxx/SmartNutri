
// src/app/pro/patients/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, PlusCircle, Users } from 'lucide-react';
import type { UserProfile } from '@/types/user';
import type { Room } from '@/types/room';
import AppLayout from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import CreateRoomModal from '@/components/pro/create-room-modal';
import RoomCard from '@/components/pro/room-card';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { doc, onSnapshot, Unsubscribe, collection, query, where, getDocs } from 'firebase/firestore';

export default function ProPatientsPage() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    let unsubProfile: Unsubscribe | undefined;
    let unsubRooms: Unsubscribe | undefined;

    if (firestore) {
      const userRef = doc(firestore, 'users', user.uid);
      unsubProfile = onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
          const profileData = { id: doc.id, ...doc.data() } as UserProfile;
           setUserProfile(profileData);
           if (profileData.profileType !== 'professional') {
             router.push('/dashboard');
             return;
           }

           // Once we have the professional's profile, fetch their rooms.
           if (profileData.professionalRoomIds && profileData.professionalRoomIds.length > 0) {
                const roomsRef = collection(firestore, 'rooms');
                const q = query(roomsRef, where('professionalId', '==', user.uid));

                unsubRooms = onSnapshot(q, (snapshot) => {
                    const fetchedRooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
                    setRooms(fetchedRooms);
                    setLoading(false);
                }, (error) => {
                    console.error("Error fetching rooms:", error);
                    setLoading(false);
                });
           } else {
               // No rooms yet
               setRooms([]);
               setLoading(false);
           }

        } else {
             setLoading(false);
        }
      });
    }

    return () => {
      if (unsubProfile) unsubProfile();
      if (unsubRooms) unsubRooms();
    };

  }, [user, isUserLoading, router, firestore]);

  const handleProfileUpdate = useCallback((updatedProfile: Partial<UserProfile>) => {
    setUserProfile(prevProfile => {
        if (!prevProfile) return null;
        return { ...prevProfile, ...updatedProfile };
    });
  }, []);


  if (loading || isUserLoading) {
    return (
       <AppLayout
        user={user}
        userProfile={userProfile}
        onMealAdded={() => {}}
        onProfileUpdate={handleProfileUpdate}
      >
        <div className="flex w-full h-full flex-col bg-background items-center justify-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Carregando pacientes...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
        user={user}
        userProfile={userProfile}
        onMealAdded={() => {}}
        onProfileUpdate={handleProfileUpdate}
    >
       <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 animate-fade-in text-center sm:text-left gap-4">
                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-foreground font-heading">Gestão de Pacientes</h1>
                    <p className="text-muted-foreground max-w-2xl mt-2 mx-auto sm:mx-0">Crie salas, adicione pacientes e acompanhe o progresso de cada um.</p>
                </div>
                 <Button onClick={() => setModalOpen(true)} disabled={!user}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Criar Nova Sala
                </Button>
            </div>

             {rooms.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {user && rooms.map(room => (
                        <RoomCard key={room.id} room={room} professionalId={user.uid} />
                    ))}
                </div>
             ) : (
                <div className="mt-12">
                    <Card className="max-w-2xl mx-auto shadow-sm rounded-2xl animate-fade-in border-dashed" style={{animationDelay: '150ms'}}>
                        <CardHeader className="text-center p-8">
                            <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                            <CardTitle className="text-2xl font-heading">Nenhum Paciente Adicionado</CardTitle>
                            <CardDescription className="mt-2">
                                Clique no botão "Criar Nova Sala" para convidar seu primeiro paciente e iniciar o acompanhamento.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </div>
             )}
       </div>

       {user && <CreateRoomModal 
          isOpen={isModalOpen}
          onOpenChange={setModalOpen}
          professionalId={user.uid}
       />}
    </AppLayout>
  );
}
