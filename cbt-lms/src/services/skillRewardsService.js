export const getCourseSkillRewards = (course) => {
  if (Array.isArray(course?.skillRewards) && course.skillRewards.length > 0) {
    return course.skillRewards
      .map((reward) => ({
        skill: String(reward?.skill ?? "").trim(),
        points: Number(reward?.points ?? 0),
      }))
      .filter((reward) => reward.skill && reward.points > 0);
  }

  const skills = Array.isArray(course?.skills) ? course.skills : [];
  return skills
    .map((skill) => ({
      skill: String(skill ?? "").trim(),
      points: Number(course?.skillPoints ?? 20),
    }))
    .filter((reward) => reward.skill && reward.points > 0);
};
