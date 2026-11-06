'use client';
import { useParams } from 'next/navigation';
import { NewQueryForm } from '@/components/portal/parent-queries';
export default function NewQuery() { const { studentId } = useParams<{ studentId: string }>(); return <NewQueryForm studentId={studentId} />; }
