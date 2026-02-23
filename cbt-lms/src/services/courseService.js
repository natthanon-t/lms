import { CONTENT_STATUS_OPTIONS } from "../constants/appConfig";
import { ensureCoverImage } from "./imageService";
import { getCourseSkillRewards } from "./skillRewardsService";

export const normalizeSkillRewardList = (item) => {
  if (Array.isArray(item.skillRewards)) {
    return item.skillRewards
      .map((entry) => ({
        skill: String(entry?.skill ?? "").trim(),
        points: Number(entry?.points ?? 0),
      }))
      .filter((entry) => entry.skill && entry.points > 0);
  }

  if (item.skillRewards && typeof item.skillRewards === "object") {
    return Object.entries(item.skillRewards)
      .map(([skill, points]) => ({
        skill: String(skill ?? "").trim(),
        points: Number(points ?? 0),
      }))
      .filter((entry) => entry.skill && entry.points > 0);
  }

  return [];
};

export const normalizeExampleRecord = (item) => {
  const normalizedStatus = String(item.status ?? "active").toLowerCase();
  const normalizedSkills = Array.isArray(item.skills)
    ? item.skills.map((skill) => String(skill).trim()).filter(Boolean)
    : [];
  const normalizedSkillRewards = normalizeSkillRewardList(item);
  const fallbackSkillPoints = Number(item.skillPoints ?? 20);
  const mergedSkills = Array.from(
    new Set([...normalizedSkills, ...normalizedSkillRewards.map((reward) => reward.skill)]),
  );
  const skillRewards = normalizedSkillRewards.length
    ? normalizedSkillRewards
    : mergedSkills.map((skill) => ({ skill, points: fallbackSkillPoints }));
  const ensuredSkillRewards = skillRewards.length
    ? skillRewards
    : [{ skill: "Cyber Fundamentals", points: fallbackSkillPoints > 0 ? fallbackSkillPoints : 20 }];
  const ensuredSkills = Array.from(new Set(ensuredSkillRewards.map((reward) => reward.skill)));

  return {
    ...item,
    status: CONTENT_STATUS_OPTIONS.includes(normalizedStatus) ? normalizedStatus : "active",
    creator: item.creator ?? "Cyber Training Team",
    ownerUsername: String(item.ownerUsername ?? "").trim(),
    description: item.description ?? "คอร์สเนื้อหาด้าน Cyber Security",
    image: ensureCoverImage(item.image, item.id ?? `course-${Date.now()}`),
    skills: ensuredSkills,
    skillRewards: ensuredSkillRewards,
    skillPoints: fallbackSkillPoints,
    subtopicCompletionScore: Number(item.subtopicCompletionScore ?? 20),
    courseCompletionScore: Number(item.courseCompletionScore ?? 100),
  };
};

export const toCourseDraft = (course) => ({
  sourceId: course.id,
  ...course,
});

export const buildNewCourseRecord = ({ now, courseIndex, creator, ownerUsername }) =>
  normalizeExampleRecord({
    id: `course-${now}`,
    title: `เนื้อหาใหม่ ${courseIndex}`,
    creator: creator ?? "Cyber Training Team",
    ownerUsername: ownerUsername ?? "",
    description: "เนื้อหาใหม่สำหรับฝึกการเรียนรู้ด้าน Cyber Security",
    image: `https://picsum.photos/seed/course-${now}/640/360`,
    status: "inprogress",
    skills: ["Log Analysis"],
    skillRewards: [
      { skill: "Log Analysis", points: 20 },
      { skill: "Threat Detection", points: 15 },
    ],
    skillPoints: 20,
    subtopicCompletionScore: 20,
    courseCompletionScore: 100,
    content: `# เนื้อหาใหม่

## หัวข้อหลัก 1
อธิบายภาพรวมหัวข้อหลัก

### หัวข้อย่อย 1
ใส่รายละเอียดหัวข้อย่อย
- [SCORE] 20`,
  });

export const getCourseSkillTotalPoints = (course) =>
  getCourseSkillRewards(course).reduce((sum, reward) => sum + reward.points, 0);
