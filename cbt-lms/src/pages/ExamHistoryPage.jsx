import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const loadAttempts = async () => {
      if (mode === "management") {
        const data = await fetchAllExamAttemptsAdminApi();
        if (mounted) {
          setAttempts(data);
        }
        return;
      }

      const data = await fetchMyExamAttemptsApi();
      if (mounted) {
        setAttempts(
          data.map((attempt) => ({
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
      }
    };

    void loadAttempts()
      .catch(() => {
        if (mounted) {
          setAttempts([]);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [mode]);

  const examTitles = useMemo(() => {
    const titles = [...new Set(attempts.map((a) => a.examTitle).filter(Boolean))];
    return titles.sort();
  }, [attempts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return attempts.filter((attempt) => {
      if (filterExam && attempt.examTitle !== filterExam) {
        return false;
      }
      if (mode === "management" && q) {
        return attempt.name?.toLowerCase().includes(q) || attempt.employeeCode?.includes(q);
      }
      if (mode !== "management" && q) {
        return attempt.examTitle?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [attempts, filterExam, mode, search]);

  const passCount = filtered.filter((attempt) => attempt.scorePercent >= PASS_THRESHOLD).length;
  const avgScore = filtered.length
    ? Math.round(filtered.reduce((sum, attempt) => sum + attempt.scorePercent, 0) / filtered.length)
    : 0;
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
        <article className="metric-card"><h3>รายการทั้งหมด</h3><p>{filtered.length}</p></article>
        <article className="metric-card"><h3>ผ่านการสอบ</h3><p style={{ color: "#166534" }}>{passCount}</p></article>
        <article className="metric-card"><h3>ไม่ผ่าน</h3><p style={{ color: "#b91c1c" }}>{filtered.length - passCount}</p></article>
        <article className="metric-card"><h3>คะแนนเฉลี่ย</h3><p>{avgScore}%</p></article>
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
            ) : filtered.length === 0 ? (
              <tr><td colSpan={totalColumns} style={{ textAlign: "center", color: "#6b8ab8", padding: "24px" }}>ไม่พบข้อมูล</td></tr>
            ) : (
              filtered.map((row, index) => (
                <tr key={`${row.id}-${index}`}>
                  <td>{index + 1}</td>
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

    </section>
  );
}
