'use client';

import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';

// Extend the window interface for the beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Update UI notify the user they can install the PWA
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      // Clear the deferredPrompt so it can be garbage collected
      setDeferredPrompt(null);
      setIsInstallable(false);
      setIsInstalled(true);
      console.log('PWA was installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    await deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  if (!isInstallable || isInstalled) {
    return null;
  }

  return (
    <div className="bg-sv-accent/10 border-b border-sv-accent/20 px-4 py-2 flex items-center justify-between animate-fade-in z-50">
      <div className="flex items-center gap-2">
        <div className="bg-sv-accent/20 p-1.5 rounded-lg">
          <Download className="h-4 w-4 text-sv-accent" />
        </div>
        <div>
          <p className="text-sm font-medium text-sv-text-primary">Install SONIVAULT App</p>
          <p className="text-xs text-sv-text-secondary hidden sm:block">Install this app on your device for quick offline access.</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={() => setIsInstallable(false)}
          className="text-xs text-sv-text-muted hover:text-sv-text-primary px-2 py-1 transition-colors cursor-pointer"
        >
          Dismiss
        </button>
        <Button size="sm" onClick={handleInstallClick}>
          Install App
        </Button>
      </div>
    </div>
  );
}
