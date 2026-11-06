'use client';
import { Check, Copy, Download } from 'lucide-react';
import { useState } from 'react';
import { Alert, Button, Modal } from '@/components/ui';
import { downloadFile, toCsv } from '@/lib/utils';
import type { Credentials } from '@/lib/accounts';

export function CredentialsDialog({ items, onClose }: { items: Credentials[]; onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  const text = (c: Credentials) => `${c.name}\nLogin: ${c.login}${c.login.includes('@') ? '' : `\nSchool code: ${c.schoolCode}`}\nTemporary password: ${c.password}`;
  return (
    <Modal open={items.length > 0} onClose={onClose} title="Account created" description="Share these details securely. The password is shown only once." size="md"
      footer={<>
        {items.length > 1 && <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={() => downloadFile('login-slips.csv', toCsv([['Name', 'Login', 'School code', 'Temporary password'], ...items.map((c) => [c.name, c.login, c.schoolCode, c.password])]))}>Download CSV</Button>}
        <Button onClick={onClose}>Done</Button></>}>
      <div className="space-y-3">
        <Alert tone="warn">The user will be asked to choose a new password the first time they sign in.</Alert>
        {items.map((c) => (
          <div key={c.uid} className="rounded-xl border border-slate-200 p-4 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <p className="font-semibold text-slate-900">{c.name}</p>
                <p><span className="text-slate-500">Login:</span> <span className="font-mono">{c.login}</span></p>
                {!c.login.includes('@') && <p><span className="text-slate-500">School code:</span> <span className="font-mono">{c.schoolCode}</span></p>}
                <p><span className="text-slate-500">Password:</span> <span className="font-mono">{c.password}</span></p>
              </div>
              <Button size="sm" variant="secondary" icon={copied === c.uid ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                onClick={async () => { await navigator.clipboard.writeText(text(c)); setCopied(c.uid); setTimeout(() => setCopied(null), 1500); }}>{copied === c.uid ? 'Copied' : 'Copy'}</Button>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
