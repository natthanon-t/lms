import { getSubtopicPages } from "../components/markdown/headingUtils";
import { getCourseSkillRewards } from "./skillRewardsService";

export const calculateLearningStats = (users, examples, learningProgress) => {
  const stats = {};

  Object.keys(users).forEach((username) => {
    const userProgress = learningProgress?.[username] ?? {};
    let totalScore = 0;
    let solvedQuestions = 0;
    let completedCourses = 0;
    const skillScores = {};

    examples.forEach((course) => {
      const courseProgress = userProgress?.[course.id] ?? {};
      const subtopics = getSubtopicPages(course.content, course.title);
      const completedSubtopics = courseProgress.completedSubtopics ?? {};
      const answers = courseProgress.answers ?? {};
      let allDone = subtopics.length > 0;

      subtopics.forEach((subtopic) => {
        const isDone = Boolean(completedSubtopics[subtopic.id]);
        if (!isDone) {
          allDone = false;
          return;
        }

        totalScore += Number(subtopic.baseScore ?? course.subtopicCompletionScore ?? 20);
        const subtopicAnswers = answers[subtopic.id] ?? {};
        subtopic.questions.forEach((question) => {
          if (subtopicAnswers[question.id]?.isCorrect) {
            totalScore += Number(question.points ?? 0);
            solvedQuestions += 1;
          }
        });
      });

      if (allDone && subtopics.length > 0) {
        totalScore += Number(course.courseCompletionScore ?? 100);
        completedCourses += 1;

        getCourseSkillRewards(course).forEach((reward) => {
          const skill = String(reward.skill ?? "").trim();
          const points = Number(reward.points ?? 0);
          if (!skill || points <= 0) {
            return;
          }
          skillScores[skill] = Number(skillScores[skill] ?? 0) + points;
        });
      }
    });

    stats[username] = {
      score: totalScore,
      solvedQuestions,
      completedCourses,
      skillScores,
    };
  });

  return stats;
};
