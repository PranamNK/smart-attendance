export type ReviewDecision = { resolvedStudentId: string | null } | null;
export type RosterEntry = { studentId: string };

export function unresolvedReviewCount(reviews: ReviewDecision[]): number {
  return reviews.filter((review) => review === null).length;
}

export function hasDuplicateAssignments(reviews: ReviewDecision[]): boolean {
  const assigned = reviews.flatMap((review) => review?.resolvedStudentId ? [review.resolvedStudentId] : []);
  return new Set(assigned).size !== assigned.length;
}

export function finalStatuses(roster: RosterEntry[], reviews: ReviewDecision[]) {
  const present = new Set(reviews.flatMap((review) => review?.resolvedStudentId ? [review.resolvedStudentId] : []));
  return roster.map(({ studentId }) => ({ studentId, status: present.has(studentId) ? "PRESENT" as const : "ABSENT" as const }));
}
