import { useState } from 'react';

export function useHold(socket: any) {
  const [holding, setHolding] = useState(false);
  const start = () => { setHolding(true); socket?.emit?.('hold', { on: true }); };
  const stop = () => { setHolding(false); socket?.emit?.('hold', { on: false }); };
  return { holding, start, stop };
}