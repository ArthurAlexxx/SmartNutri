
// src/components/dashboard-header.tsx
'use client';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, LogOut, User as UserIcon, Settings, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { MealData } from '@/types/meal';
import type { User } from 'firebase/auth';
import { type UserProfile } from '@/types/user';
import SettingsModal from './settings-modal';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';

interface DashboardHeaderProps {
  user: User | null;
  userProfile: UserProfile | null;
  onProfileUpdate: (updatedProfile: Partial<UserProfile>) => void;
}

export default function DashboardHeader({ user, userProfile, onProfileUpdate }: DashboardHeaderProps) {
  const router = useRouter();
  const auth = useAuth();
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const userId = user?.uid;
  const userName = userProfile?.fullName || user?.displayName || 'Visitante';
  const userEmail = user?.email || 'visitante@email.com';
  const userInitials = userName.split(' ').map(n => n[0]).join('');

  return (
    <>
      <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button id="user-profile-button" variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user?.photoURL || undefined} alt={userName} />
                  <AvatarFallback>
                    <UserIcon className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                    <p className='font-semibold'>{userName}</p>
                    <p className='text-xs font-normal text-muted-foreground'>{userEmail}</p>
                </DropdownMenuLabel>
              <DropdownMenuSeparator />
                <DropdownMenuItem 
                    onClick={() => userProfile && setSettingsModalOpen(true)}
                    disabled={!userProfile}
                >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Configurações</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-500 focus:text-red-500 focus:bg-red-50/80">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
      </div>
      
      {userProfile && userId && (
         <SettingsModal
            isOpen={isSettingsModalOpen}
            onOpenChange={setSettingsModalOpen}
            userProfile={userProfile}
            userId={userId}
            onProfileUpdate={onProfileUpdate}
         />
      )}
    </>
  );
}
