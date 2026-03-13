import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import logoMark from "../../assets/logo.png";
import { avatarStorageKey, getAvatarColor, getInitials } from "../../utils/avatar";
import { getLevel } from "../../utils/level";
import { getCourseSkillRewards } from "../../services/skillRewardsService";
import { useAuth } from "../../contexts/AuthContext";
import { useAppData } from "../../contexts/AppDataContext";
import { fetchCoursesApi } from "../../services/courseApiService";
import { fetchExamsApi } from "../../services/examApiService";
import { normalizeExampleRecord } from "../../services/courseService";
import { normalizeExamRecord } from "../../services/examService";

export default function WorkspaceTopbar() {
  const navigate = useNavigate();
  const { currentUser, currentUserKey } = useAuth();
  const { examples, examBank, openContentDetail, openExam, userTotalScore } = useAppData();

  const totalScore = userTotalScore ?? 0;

  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [allSearchCourses, setAllSearchCourses] = useState(null);
  const [allSearchExams, setAllSearchExams] = useState(null);

  // Fetch all pages whenever the search modal opens
  useEffect(() => {
    if (!showSearchModal) return;
    setAllSearchCourses(null);
    setAllSearchExams(null);

    const fetchAll = async (fetcher, normalize, setter) => {
      try {
        const first = await fetcher({ page: 1, limit: 100 });
        const key = first.courses !== undefined ? "courses" : "exams";
        let all = first[key];
        const { total_pages } = first.pagination;
        if (total_pages > 1) {
          const rest = await Promise.all(
            Array.from({ length: total_pages - 1 }, (_, i) =>
              fetcher({ page: i + 2, limit: 100 }).then((r) => r[key]),
            ),
          );
          all = [...all, ...rest.flat()];
        }
        setter(all.map(normalize));
      } catch {
        setter([]);
      }
    };

    void Promise.all([
      fetchAll(fetchCoursesApi, normalizeExampleRecord, setAllSearchCourses),
      fetchAll(fetchExamsApi, normalizeExamRecord, setAllSearchExams),
    ]);
  }, [showSearchModal]);

  const handleLogoError = (event) => {
    if (event.currentTarget.dataset.fallbackApplied === "true") return;
    event.currentTarget.dataset.fallbackApplied = "true";
    event.currentTarget.src = "/logo.png";
  };

  const avatar = useMemo(() => {
    if (!currentUserKey) return "";
    try { return localStorage.getItem(avatarStorageKey(currentUserKey)) ?? ""; } catch { return ""; }
  }, [currentUserKey]);

  const avatarColor = getAvatarColor(currentUserKey);
  const initials = getInitials(currentUser?.name, currentUserKey);
  const level = useMemo(() => getLevel(totalScore), [totalScore]);

  const keyword = useMemo(() => searchQuery.trim().toLowerCase(), [searchQuery]);
  const searchLoading = allSearchCourses === null || allSearchExams === null;
  const filteredExamples = useMemo(
    () => (allSearchCourses ?? examples).filter((ex) => !keyword || ex.title.toLowerCase().includes(keyword)),
    [allSearchCourses, examples, keyword],
  );
  const filteredExams = useMemo(
    () => (allSearchExams ?? examBank).filter((exam) => !keyword || exam.title.toLowerCase().includes(keyword)),
    [allSearchExams, examBank, keyword],
  );

  const handleEnterClass = async (example) => {
    const result = openContentDetail(example);
    if (result?.blocked) return;
    navigate(`/content/${example.id}`);
    setShowSearchModal(false);
  };

  const handleEnterExam = async (exam) => {
    const result = await openExam(exam);
    if (result?.success) {
      navigate(`/exam/${exam.id}`);
    }
    setShowSearchModal(false);
  };

  return (
    <header className="workspace-topbar">
      <button type="button" className="workspace-topbar-brand" onClick={() => navigate("/")}>
        <img src={logoMark} alt="LMS logo" className="workspace-topbar-logo" onError={handleLogoError} />
        <div>
          <h1>LMS Panel</h1>
          <p>MANAGEMENT CONSOLE</p>
        </div>
      </button>

      <div className="workspace-topbar-user">
        <button
          type="button"
          className="topbar-search-icon"
          onClick={() => setShowSearchModal(true)}
          title="ค้นหาเนื้อหา"
          aria-label="ค้นหา"
        >
          ⌕
        </button>
        <button
          type="button"
          className="topbar-avatar-circle"
          style={{ background: avatar ? "transparent" : avatarColor }}
          onClick={() => navigate("/profile")}
          title="ไปหน้าโปรไฟล์"
        >
          {avatar ? (
            <img src={avatar} alt="avatar" className="topbar-avatar-img" />
          ) : (
            <span className="topbar-avatar-initials">{initials}</span>
          )}
        </button>
        <button type="button" className="topbar-user-info" onClick={() => navigate("/profile")}>
          <p className="topbar-user-line1">{currentUser?.name ?? "Guest"} / {currentUser?.role ?? "ผู้เยี่ยมชม"}</p>
          {currentUser && (
            <p className="topbar-user-line2" style={{ color: level.color }}>
              Lv.{level.num} {level.label}
            </p>
          )}
        </button>
      </div>

      {showSearchModal && (
        <div className="search-modal-backdrop" onClick={() => setShowSearchModal(false)}>
          <article className="search-modal" onClick={(e) => e.stopPropagation()}>
            <div className="search-modal-header">
              <h3>ค้นหาเนื้อหาและข้อสอบ</h3>
              <button type="button" className="search-modal-close" onClick={() => setShowSearchModal(false)} aria-label="ปิด">
                ✕
              </button>
            </div>
            <div className="search-modal-body">
              <input
                type="text"
                className="search-modal-input"
                placeholder="พิมพ์ชื่อเนื้อหา หรือข้อสอบ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />

              {keyword && (
                <div className="search-modal-results">
                  {searchLoading ? (
                    <p className="search-result-empty">กำลังโหลด...</p>
                  ) : (
                    <>
                  {filteredExamples.length > 0 && (
                    <div className="search-result-section">
                      <h4>เนื้อหา</h4>
                      <div className="search-result-list">
                        {filteredExamples.map((example) => {
                          const skills = getCourseSkillRewards(example);
                          return (
                            <button
                              key={example.id}
                              type="button"
                              className="search-result-item"
                              onClick={() => handleEnterClass(example)}
                            >
                              <div className="search-result-title">{example.title}</div>
                              {example.description && (
                                <div className="search-result-desc">{example.description}</div>
                              )}
                              {skills.length > 0 && (
                                <div className="search-result-skills">
                                  {skills.map((skill) => (
                                    <span key={`${example.id}-${skill.skill}`} className="search-result-skill-tag">
                                      {skill.skill}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {filteredExams.length > 0 && (
                    <div className="search-result-section">
                      <h4>ข้อสอบ</h4>
                      <div className="search-result-list">
                        {filteredExams.map((exam) => (
                          <button
                            key={exam.id}
                            type="button"
                            className="search-result-item"
                            onClick={() => handleEnterExam(exam)}
                          >
                            <div className="search-result-title">{exam.title}</div>
                            {exam.description && (
                              <div className="search-result-desc">{exam.description}</div>
                            )}
                            <div className="search-result-meta">
                              {exam.numberOfQuestions && (
                                <span className="search-result-meta-item">📝 {exam.numberOfQuestions} ข้อ</span>
                              )}
                              {exam.defaultTime && (
                                <span className="search-result-meta-item">⏱ {exam.defaultTime} นาที</span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredExamples.length === 0 && filteredExams.length === 0 && (
                    <p className="search-result-empty">ไม่พบผลการค้นหา</p>
                  )}
                    </>
                  )}
                </div>
              )}
            </div>
          </article>
        </div>
      )}
    </header>
  );
}
