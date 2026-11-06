'use client';
import { useEffect, useRef, useState } from 'react';
import { ImageIcon, Upload } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '@/lib/firebase/client';
import { useActor, useAuth } from '@/lib/auth/auth-provider';
import { Writer } from '@/lib/firebase/writer';
import { addAudit } from '@/lib/audit';
import { Button, Card, CardHeader, Field, Input, PageHeader, PageLoader, useToast, errMsg } from '@/components/ui';

function ImageUpload({ label, kind, url, schoolId, field }: { label: string; kind: string; url?: string; schoolId: string; field: string }) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function pick(f?: File) {
    if (!f) return;
    if (!f.type.startsWith('image/') || f.size > 2 * 1024 * 1024) return toast.error('Choose an image under 2 MB.');
    setBusy(true);
    try {
      const r = ref(storage, `schools/${schoolId}/branding/${kind}-${Date.now()}`);
      await uploadBytes(r, f);
      await updateDoc(doc(db, 'schools', schoolId), { [field]: await getDownloadURL(r) });
      toast.success(`${label} updated.`);
    } catch (e) { toast.error(errMsg(e)); }
    setBusy(false);
  }
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 p-4">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
        {url ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={url} alt={label} className="h-full w-full object-contain" /> : <ImageIcon className="h-6 w-6 text-slate-400" />}
      </div>
      <div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-900">{label}</p><p className="text-xs text-slate-500">PNG or JPG, max 2 MB. Appears on report cards.</p></div>
      <Button size="sm" variant="secondary" loading={busy} icon={<Upload className="h-4 w-4" />} onClick={() => input.current?.click()}>Upload</Button>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
    </div>
  );
}

export default function SchoolProfilePage() {
  const a = useActor();
  const { school } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ name: '', motto: '', address: '', phone: '', email: '', website: '', principalName: '' });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (school) setF({ name: school.name ?? '', motto: school.motto ?? '', address: school.address ?? '', phone: school.phone ?? '', email: school.email ?? '', website: school.website ?? '', principalName: school.principalName ?? '' });
  }, [school?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!school) return <PageLoader />;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      await updateDoc(doc(db, 'schools', a.schoolId), f);
      const w = new Writer(); addAudit(w, a, { action: 'UPDATE', entityType: 'School', entityId: a.schoolId, summary: 'Updated school profile' }); await w.commit();
      toast.success('School profile saved.');
    } catch (err) { toast.error(errMsg(err)); }
    setBusy(false);
  }
  return (
    <>
      <PageHeader title="School profile & branding" description="These details appear on every report card." />
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Details" description={`School code: ${school.code}`} />
          <form onSubmit={save} className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="School name" required className="sm:col-span-2"><Input value={f.name} onChange={set('name')} required /></Field>
            <Field label="Motto" className="sm:col-span-2"><Input value={f.motto} onChange={set('motto')} /></Field>
            <Field label="Address" className="sm:col-span-2"><Input value={f.address} onChange={set('address')} /></Field>
            <Field label="Phone"><Input value={f.phone} onChange={set('phone')} /></Field>
            <Field label="Email"><Input type="email" value={f.email} onChange={set('email')} /></Field>
            <Field label="Website"><Input value={f.website} onChange={set('website')} /></Field>
            <Field label="Principal's name"><Input value={f.principalName} onChange={set('principalName')} /></Field>
            <div className="sm:col-span-2"><Button type="submit" loading={busy}>Save changes</Button></div>
          </form>
        </Card>
        <Card className="space-y-3 p-5 lg:col-span-2">
          <h3 className="font-semibold">Branding</h3>
          <ImageUpload label="School logo" kind="logo" url={school.logoUrl} schoolId={a.schoolId} field="logoUrl" />
          <ImageUpload label="Principal's signature" kind="signature" url={school.signatureUrl} schoolId={a.schoolId} field="signatureUrl" />
          <ImageUpload label="School stamp" kind="stamp" url={school.stampUrl} schoolId={a.schoolId} field="stampUrl" />
        </Card>
      </div>
    </>
  );
}
