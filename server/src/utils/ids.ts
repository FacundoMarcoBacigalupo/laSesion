import { nanoid } from 'nanoid';
export const newId = (size = 12) => nanoid(size);
export const newToken = () => nanoid(32);