interface SubjectMeta {
    label: string;
    value: string;
    file: string;
  }

// src/utils/getQuizData.ts
export async function getQuizData(subjectValue: string) {
    const subjects: SubjectMeta[] = await fetch('/data/subjects.json').then(res => res.json());
    const subject = subjects.find((s: any) => s.value === subjectValue);
    if (!subject) throw new Error('Subject not found');
    return await fetch(`/data/${subject.file}`).then(res => res.json());
  }
  