import React from 'react';

export const App: React.FC = () => {
  return (
    <main className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[390px] mx-auto flex flex-col items-center gap-4 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-amber-500">SmartForge</h1>
        <p className="text-sm text-neutral-300">
          Entrenador personal digital con sobrecarga progresiva y auditoría de fatiga.
        </p>
      </div>
    </main>
  );
};

export default App;
