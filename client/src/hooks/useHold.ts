import { useState } from 'react';

export function useHold(socket: any) {
  const [holding, setHolding] = useState(false);
  // Accept either a Socket or the ref used by useSocket. Reading the ref at
  // action time avoids capturing null before useSocket's effect has connected.
  const emit = (payload: { on: boolean }) => {
    const current = socket?.current ?? socket;
    current?.emit?.('hold', payload);
  };
  const start = () => { setHolding(true); emit({ on: true }); };
  const stop = () => { setHolding(false); emit({ on: false }); };
  return { holding, start, stop };
}
