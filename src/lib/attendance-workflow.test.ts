import { describe, expect, it } from "vitest";
import { finalStatuses, hasDuplicateAssignments, unresolvedReviewCount } from "./attendance-workflow";

describe("manual attendance workflow", () => {
  const roster = [{ studentId: "student-a" }, { studentId: "student-b" }, { studentId: "student-c" }];
  it("requires every detected-face placeholder to be reviewed", () => {
    expect(unresolvedReviewCount([{ resolvedStudentId: "student-a" }, null])).toBe(1);
  });
  it("rejects duplicate student assignments", () => {
    expect(hasDuplicateAssignments([{ resolvedStudentId: "student-a" }, { resolvedStudentId: "student-a" }])).toBe(true);
  });
  it("allows an unknown placeholder without marking a student present", () => {
    expect(finalStatuses(roster, [{ resolvedStudentId: "student-a" }, { resolvedStudentId: null }])).toEqual([
      { studentId: "student-a", status: "PRESENT" }, { studentId: "student-b", status: "ABSENT" }, { studentId: "student-c", status: "ABSENT" },
    ]);
  });
  it("supports correction of a prior assignment before confirmation", () => {
    const corrected = [{ resolvedStudentId: "student-b" }];
    expect(hasDuplicateAssignments(corrected)).toBe(false);
    expect(finalStatuses(roster, corrected)[1].status).toBe("PRESENT");
  });
});
