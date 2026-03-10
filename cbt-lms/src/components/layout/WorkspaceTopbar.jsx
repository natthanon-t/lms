import { useMemo, useState } from "react";
import logoMark from "../../assets/logo.png";
import { getAvatarColor, getInitials } from "../../utils/avatar";
import { getLevel } from "../../utils/level";
import { getCourseSkillRewards } from "../../services/skillRewardsService";

export default function WorkspaceTopbar({ currentUser, username, totalScore = 0, onGoHome, onGoProfile, examples = [], examBank = [], onEnterClass, onEnterExam }) {
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const handleLogoError = (event) => {
    if (event.currentTarget.dataset.fallbackApplied === "true") {
      return;
    }
    event.currentTarget.dataset.fallbackApplied = "true";
    event.currentTarget.src = "/logo.png";
  };

  const avatar = useMemo(() => {
    if (!username) return "";
    try { return localStorage.getItem(`profile_avatar_${username}`) ?? ""; } catch { return ""; }
  }, [username]);

  const avatarColor = getAvatarColor(username);
  const initials = getInitials(currentUser?.name, username);
  const level = useMemo(() => getLevel(totalScore), [totalScore]);

  const keyword = useMemo(() => searchQuery.trim().toLowerCase(), [searchQuery]);
  const filteredExamples = useMemo(
    () => examples.filter((ex) => !keyword || ex.title.toLowerCase().includes(keyword)),
    [examples, keyword],
  );
  const filteredExams = useMemo(
    () => examBank.filter((exam) => !keyword || exam.title.toLowerCase().includes(keyword)),
    [examBank, keyword],
  );

  return (
    <header className="workspace-topbar">
      <button type="button" className="workspace-topbar-brand" onClick={onGoHome}>
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
          onClick={onGoProfile}
          title="ไปหน้าโปรไฟล์"
        >
          {avatar ? (
            <img src={avatar} alt="avatar" className="topbar-avatar-img" />
          ) : (
            <span className="topbar-avatar-initials">{initials}</span>
          )}
        </button>
        <button type="button" className="topbar-user-info" onClick={onGoProfile}>
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
                              onClick={() => {
                                onEnterClass?.(example);
                                setShowSearchModal(false);
                              }}
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
                            onClick={() => {
                              onEnterExam?.(exam);
                              setShowSearchModal(false);
                            }}
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
                </div>
              )}
            </div>
          </article>
        </div>
      )}
    </header>
  );
}
