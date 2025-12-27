'use client';

import { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '@/lib/store';
import { AuthProvider } from './AuthProvider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </PersistGate>
    </Provider>
  );
}
