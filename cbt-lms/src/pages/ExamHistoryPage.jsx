import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPageNumbers } from "../utils/pagination";
import {
  fetchAllExamAttemptsAdminApi,
  fetchMyExamAttemptsApi,
} from "../services/examApiService";
import { useAuth } from "../contexts/AuthContext";

const PASS_THRESHOLD = 70;

function ResultBadge({ score }) {
  const pass = score >= PASS_THRESHOLD;
  return (
    <span className={`status-badge ${pass ? "badge-completed" : "badge-fail"}`}>
      {pass ? "ผ่าน" : "ไม่ผ่าน"}
    </span>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleString("th-TH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ExamHistoryPage() {
  const navigate = useNavigate();
  const { canViewAllExamHistory } = useAuth();
  const mode = canViewAllExamHistory ? "management" : "self";
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterExam, setFilterExam] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ total: 0, passCount: 0, avgScore: 0 });
  const [examTitles, setExamTitles] = useState([]);

  // Debounce search input
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef(null);
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const loadAttempts = useCallback(async (page, searchVal, examTitleVal) => {
    setLoading(true);
    try {
      const params = { page, search: searchVal, examTitle: examTitleVal };
      if (mode === "management") {
        const res = await fetchAllExamAttemptsAdminApi(params);
        setAttempts(res.attempts);
        setTotalPages(res.pagination.total_pages);
        if (res.stats) setStats(res.stats);
        if (res.examTitles) setExamTitles(res.examTitles);
      } else {
        const res = await fetchMyExamAttemptsApi(params);
        setAttempts(
          res.attempts.map((attempt) => ({
            id: String(attempt.id),
            examId: attempt.examId ?? "",
            examTitle: attempt.examTitle ?? attempt.examId ?? "—",
            employeeCode: "",
            name: "ฉัน",
            correctCount: attempt.correctCount,
            totalQuestions: attempt.totalQuestions,
            scorePercent: attempt.scorePercent,
            startedAt: attempt.startedAt,
            finishedAt: attempt.finishedAt,
          }))
        );
        setTotalPages(res.pagination.total_pages);
        if (res.stats) setStats(res.stats);
        if (res.examTitles) setExamTitles(res.examTitles);
      }
    } catch {
      setAttempts([]);
    } finally {
      setLoading(false);
    }
  }, [mode]);

  // Re-fetch when filters or page change
  useEffect(() => {
    setCurrentPage(1);
    void loadAttempts(1, debouncedSearch, filterExam);
  }, [loadAttempts, debouncedSearch, filterExam]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    void loadAttempts(page, debouncedSearch, filterExam);
  };

  const totalColumns = mode === "management" ? 9 : 7;

  return (
    <section className="workspace-content">
      <header className="content-header">
        <div>
          <h1>ประวัติการสอบ</h1>
          <p>{mode === "management" ? "รายการผลการสอบของผู้ใช้ทั้งหมด" : "รายการผลการสอบของคุณ"}</p>
        </div>
      </header>

      <div className="metric-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
        <article className="metric-card"><h3>รายการทั้งหมด</h3><p>{stats.total}</p></article>
        <article className="metric-card"><h3>ผ่านการสอบ</h3><p style={{ color: "#166534" }}>{stats.passCount}</p></article>
        <article className="metric-card"><h3>ไม่ผ่าน</h3><p style={{ color: "#b91c1c" }}>{stats.total - stats.passCount}</p></article>
        <article className="metric-card"><h3>คะแนนเฉลี่ย</h3><p>{Math.round(stats.avgScore)}%</p></article>
      </div>

      <div className="exam-history-filters">
        <input
          type="text"
          className="exam-history-search"
          placeholder={mode === "management" ? "ค้นหาชื่อหรือรหัสพนักงาน…" : "ค้นหาชื่อข้อสอบ…"}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="course-status-select"
          value={filterExam}
          onChange={(e) => setFilterExam(e.target.value)}
        >
          <option value="">ข้อสอบทั้งหมด</option>
          {examTitles.map((title) => (
            <option key={title} value={title}>{title}</option>
          ))}
        </select>
      </div>

      <div className="leaderboard-card">
        <table>
          <thead>
            <tr>
              <th>#</th>
              {mode === "management" ? <th>รหัสพนักงาน</th> : null}
              {mode === "management" ? <th>ชื่อ-นามสกุล</th> : null}
              <th>ชื่อข้อสอบ</th>
              <th style={{ textAlign: "center" }}>คะแนน</th>
              <th style={{ textAlign: "center" }}>ถูก / ทั้งหมด</th>
              <th>ผล</th>
              <th>วันที่ทำ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={totalColumns} style={{ textAlign: "center", color: "#6b8ab8", padding: "24px" }}>กำลังโหลด…</td></tr>
            ) : attempts.length === 0 ? (
              <tr><td colSpan={totalColumns} style={{ textAlign: "center", color: "#6b8ab8", padding: "24px" }}>ไม่พบข้อมูล</td></tr>
            ) : (
              attempts.map((row, index) => (
                <tr key={`${row.id}-${index}`}>
                  <td>{(currentPage - 1) * 20 + index + 1}</td>
                  {mode === "management" ? <td>{row.employeeCode || "—"}</td> : null}
                  {mode === "management" ? <td>{row.name}</td> : null}
                  <td>{row.examTitle}</td>
                  <td style={{ textAlign: "center" }}>
                    <strong style={{ color: row.scorePercent >= PASS_THRESHOLD ? "#166534" : "#b91c1c" }}>
                      {Math.round(row.scorePercent)}%
                    </strong>
                  </td>
                  <td style={{ textAlign: "center" }}>{row.correctCount} / {row.totalQuestions}</td>
                  <td><ResultBadge score={row.scorePercent} /></td>
                  <td>{formatDate(row.finishedAt ?? row.startedAt)}</td>
                  <td>
                    <button
                      type="button"
                      className="view-answers-btn"
                      onClick={() => {
                        const examId = row.examId ?? row.id;
                        navigate(`/exam/${examId}/result`, {
                          state: {
                            result: {
                              attemptId: row.id,
                              correctCount: row.correctCount,
                              totalQuestions: row.totalQuestions,
                              gradedTotal: row.totalQuestions,
                              scorePercent: row.scorePercent,
                              details: [],
                              domainStats: [],
                            },
                            examTitle: row.examTitle,
                          },
                        });
                      }}
                    >
                      ดูคำตอบ
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav className="pagination-bar" aria-label="Exam history pagination">
          <button type="button" disabled={currentPage <= 1} onClick={() => handlePageChange(currentPage - 1)}>
            ← ก่อนหน้า
          </button>
          {getPageNumbers(currentPage, totalPages).map((p, i) =>
            p === "…" ? (
              <span key={`ellipsis-${i}`} className="pagination-ellipsis">…</span>
            ) : (
              <button
                key={p}
                type="button"
                className={p === currentPage ? "active" : ""}
                onClick={() => handlePageChange(p)}
              >
                {p}
              </button>
            )
          )}
          <button type="button" disabled={currentPage >= totalPages} onClick={() => handlePageChange(currentPage + 1)}>
            ถัดไป →
          </button>
        </nav>
      )}
    </section>
  );
}
