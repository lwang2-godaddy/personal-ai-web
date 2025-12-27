'use client';

import { useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useAppDispatch } from '@/lib/store/hooks';
import { setUser } from '@/lib/store/slices/authSlice';
import firestoreService from '@/lib/api/firebase/firestore';

/**
 * AuthProvider Component
 * Sets up Firebase Auth state listener and syncs with Redux
 * This ensures Firebase Auth state is always in sync with Redux state
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const auth = getAuth();

    // Listen to Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in - fetch full user data from Firestore
        try {
          const userData = await firestoreService.getUserData(firebaseUser.uid);

          if (userData) {
            // Update Redux with full user data including role and accountStatus
            dispatch(setUser(userData));
          } else {
            // User exists in Firebase Auth but not in Firestore
            // This shouldn't happen, but handle gracefully
            console.warn('[AuthProvider] User exists in Auth but not in Firestore:', firebaseUser.uid);
            dispatch(setUser(null));
          }
        } catch (error) {
          console.error('[AuthProvider] Error fetching user data:', error);
          dispatch(setUser(null));
        }
      } else {
        // User is signed out
        dispatch(setUser(null));
      }
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [dispatch]);

  return <>{children}</>;
}
