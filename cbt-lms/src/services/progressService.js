export const withSubmittedSubtopicAnswer = ({
  prevProgress,
  username,
  courseId,
  subtopicId,
  answerResult,
}) => ({
  ...prevProgress,
  [username]: {
    ...(prevProgress[username] ?? {}),
    [courseId]: {
      ...((prevProgress[username] ?? {})[courseId] ?? {}),
      completedSubtopics: {
        ...(((prevProgress[username] ?? {})[courseId] ?? {}).completedSubtopics ?? {}),
      },
      answers: {
        ...(((prevProgress[username] ?? {})[courseId] ?? {}).answers ?? {}),
        [subtopicId]: {
          ...((((prevProgress[username] ?? {})[courseId] ?? {}).answers ?? {})[subtopicId] ?? {}),
          [answerResult.id]: {
            typedAnswer: answerResult.typedAnswer,
            isCorrect: answerResult.isCorrect,
          },
        },
      },
    },
  },
});

export const withCompletedSubtopic = ({ prevProgress, username, courseId, subtopicId }) => ({
  ...prevProgress,
  [username]: {
    ...(prevProgress[username] ?? {}),
    [courseId]: {
      ...((prevProgress[username] ?? {})[courseId] ?? {}),
      answers: {
        ...(((prevProgress[username] ?? {})[courseId] ?? {}).answers ?? {}),
      },
      completedSubtopics: {
        ...(((prevProgress[username] ?? {})[courseId] ?? {}).completedSubtopics ?? {}),
        [subtopicId]: true,
      },
    },
  },
});

