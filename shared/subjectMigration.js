const RETIRED_SUBJECT_NAME = 'CRT (Python)';
const RETIRED_SUBJECT_IDS = new Set(['sub-6']);

export function withoutCrtSubject(subjects = [], submissions = {}) {
  const removedIds = new Set([
    ...RETIRED_SUBJECT_IDS,
    ...subjects
      .filter((subject) => subject.name?.trim() === RETIRED_SUBJECT_NAME)
      .map((subject) => subject.id),
  ]);
  const remainingSubjects = subjects.filter(
    (subject) => subject.name?.trim() !== RETIRED_SUBJECT_NAME && !removedIds.has(subject.id)
  );
  const remainingSubmissions = Object.fromEntries(
    Object.entries(submissions || {}).filter(
      ([key]) => ![...removedIds].some((subjectId) => key.endsWith(`_${subjectId}`))
    )
  );

  return { subjects: remainingSubjects, submissions: remainingSubmissions };
}
