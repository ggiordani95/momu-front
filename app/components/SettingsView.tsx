"use client";

import { Settings } from "lucide-react";

export default function SettingsView() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <Settings size={64} className="mx-auto mb-4 opacity-30" />
        <h2 className="text-2xl font-semibold mb-2">Configurações</h2>
        <p className="text-foreground/60">
          Página de configurações em desenvolvimento
        </p>
      </div>
    </div>
  );
}

