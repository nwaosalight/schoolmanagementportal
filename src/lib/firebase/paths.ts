import { collection, doc } from 'firebase/firestore';
import { db } from './client';

export const sc = (schoolId: string, name: string) => collection(db, 'schools', schoolId, name);
export const sd = (schoolId: string, name: string, id: string) => doc(db, 'schools', schoolId, name, id);
export const newId = (schoolId: string, name: string) => doc(sc(schoolId, name)).id;
export const rowsCol = (schoolId: string, sheetId: string) => collection(db, 'schools', schoolId, 'sheets', sheetId, 'rows');
export const sheetSub = (schoolId: string, sheetId: string, name: string) => collection(db, 'schools', schoolId, 'sheets', sheetId, name);
