import { useEffect, useState } from 'react';
import { readDevice } from '../lib/device';

export function useDeviceInfo() {
  const [device, setDevice] = useState<any>(null);
  useEffect(() => { readDevice().then(setDevice); }, []);
  return device;
}