import { writeBatch, type DocumentReference, type SetOptions, type WriteBatch } from 'firebase/firestore';
import { db } from './client';

/** Collects writes and commits them in chunks (Firestore limit: 500 ops per batch). */
export class Writer {
  private ops: ((b: WriteBatch) => void)[] = [];
  set(ref: DocumentReference, data: any, opts?: SetOptions) { this.ops.push((b) => (opts ? b.set(ref, data, opts) : b.set(ref, data))); return this; }
  update(ref: DocumentReference, data: any) { this.ops.push((b) => b.update(ref, data)); return this; }
  delete(ref: DocumentReference) { this.ops.push((b) => b.delete(ref)); return this; }
  get size() { return this.ops.length; }
  async commit(size = 400) {
    for (let i = 0; i < this.ops.length; i += size) {
      const b = writeBatch(db);
      this.ops.slice(i, i + size).forEach((op) => op(b));
      await b.commit();
    }
    this.ops = [];
  }
}
