import GradeWorkspaceClient from '@/components/grade/GradeWorkspaceClient';
import { AcademicYearId } from '@/types';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface GradePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: GradePageProps) {
  const { id } = await params;
  const gradeNames: Record<string, string> = {
    '1': 'الفرقة الأولى',
    '2': 'الفرقة الثانية',
    '3': 'الفرقة الثالثة',
    '4': 'الفرقة الرابعة',
  };

  const name = gradeNames[id] || 'الفرقة الدراسية';

  return {
    title: `${name} | منصة الدستور التعليمية`,
    description: `محاضرات وملخصات واختبارات ${name} على منصة الدستور التعليمية للعلوم القانونية`,
  };
}

export default async function GradePage({ params }: GradePageProps) {
  const { id } = await params;
  const numId = parseInt(id, 10);

  if (isNaN(numId) || numId < 1 || numId > 4) {
    notFound();
  }

  return <GradeWorkspaceClient gradeId={numId as AcademicYearId} />;
}
