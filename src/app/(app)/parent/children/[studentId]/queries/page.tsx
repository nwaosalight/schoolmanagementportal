'use client';
import { useParams } from 'next/navigation';
import { ParentQueries } from '@/components/portal/parent-queries';
export default function ChildQueries() { const { studentId } = useParams<{ studentId: string }>(); return <ParentQueries studentId={studentId} />; }
