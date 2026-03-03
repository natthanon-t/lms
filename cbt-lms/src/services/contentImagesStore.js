const storageKey = (courseId) => `course_images_${courseId}`;

export const getStoredImages = (courseId) => {
  if (!courseId) return {};
  try {
    return JSON.parse(localStorage.getItem(storageKey(courseId)) ?? "{}");
  } catch {
    return {};
  }
};

export const storeImage = (courseId, filename, dataUrl) => {
  const images = getStoredImages(courseId);
  images[filename] = dataUrl;
  localStorage.setItem(storageKey(courseId), JSON.stringify(images));
  return images;
};
