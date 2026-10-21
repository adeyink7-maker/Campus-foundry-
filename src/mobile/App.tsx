/**
 * CampusFoundry Mobile - Root Expo Application Entry Point
 * Orchestrates Navigation Stack, Offline WatermelonDB Caching,
 * Native Safe Area, E2EE Key Management & Scheduled Cleanups.
 */

import React from 'react';
import { RootNavigator } from './navigation/RootNavigator';
import { useBackgroundCleanup } from './useBackgroundCleanup';
import { useAutoCleanupScheduler } from './database/useAutoCleanupScheduler';

export const App: React.FC = () => {
  // Enables background periodic synchronization & key lifetime cleanup
  useBackgroundCleanup();
  useAutoCleanupScheduler();

  return (
    <div className="w-full h-full min-h-screen bg-black">
      <RootNavigator />
    </div>
  );
};

export default App;
