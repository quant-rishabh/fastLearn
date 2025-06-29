// Progress summary page: lists subjects/topics and mastery counts, allows sorting
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface MasteryData {
  subject: string;
  topic: string;
  count: number;
}

interface SubjectMeta {
  id: string;
  label: string;
  slug: string;
}
interface TopicMeta {
  id: string;
  name: string;
  subject_id: string;
}

export default function ProgressPage() {
  const [data, setData] = useState<MasteryData[]>([]);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    // Get all subjects and topics from localStorage
    let subjects: SubjectMeta[] = [];
    let topics: TopicMeta[] = [];
    try {
      const subjRaw = localStorage.getItem("subjects");
      if (subjRaw) subjects = JSON.parse(subjRaw);
    } catch {}
    // For each subject, get topics
    topics = [];
    for (const subj of subjects) {
      const cacheKey = `topics_${subj.id}`;
      try {
        const topicRaw = localStorage.getItem(cacheKey);
        if (topicRaw) {
          const parsed = JSON.parse(topicRaw);
          if (Array.isArray(parsed)) topics.push(...parsed);
        }
      } catch {}
    }
    // Build all subject/topic pairs
    const mastery: MasteryData[] = [];
    for (const subj of subjects) {
      const subjTopics = topics.filter((t) => t.subject_id === subj.id);
      for (const topic of subjTopics) {
        const masteryKey = `mastery_${subj.slug}_${topic.name}`;
        const count = Number(localStorage.getItem(masteryKey) || '0');
        mastery.push({ subject: subj.label, topic: topic.name, count });
      }
    }
    setData(mastery);
  }, []);

  // We need to get the subject slug for the quiz link. We'll add it to MasteryData.
  // So, let's rebuild the data with subjectSlug as well.
  useEffect(() => {
    let subjects: SubjectMeta[] = [];
    let topics: TopicMeta[] = [];
    try {
      const subjRaw = localStorage.getItem("subjects");
      if (subjRaw) subjects = JSON.parse(subjRaw);
    } catch {}
    topics = [];
    for (const subj of subjects) {
      const cacheKey = `topics_${subj.id}`;
      try {
        const topicRaw = localStorage.getItem(cacheKey);
        if (topicRaw) {
          const parsed = JSON.parse(topicRaw);
          if (Array.isArray(parsed)) topics.push(...parsed);
        }
      } catch {}
    }
    // Build all subject/topic pairs, now with subjectSlug
    const mastery: (MasteryData & { subjectSlug: string })[] = [];
    for (const subj of subjects) {
      const subjTopics = topics.filter((t) => t.subject_id === subj.id);
      for (const topic of subjTopics) {
        const masteryKey = `mastery_${subj.slug}_${topic.name}`;
        const count = Number(localStorage.getItem(masteryKey) || '0');
        mastery.push({ subject: subj.label, subjectSlug: subj.slug, topic: topic.name, count });
      }
    }
    setData(mastery);
  }, []);

  const sorted = [...data].sort((a, b) =>
    sortOrder === "asc" ? a.count - b.count : b.count - a.count
  );

  // Group topics by subject for table rendering
  const grouped: { [subject: string]: (MasteryData & { subjectSlug: string })[] } = {};
  for (const row of sorted as (MasteryData & { subjectSlug: string })[]) {
    if (!grouped[row.subject]) grouped[row.subject] = [];
    grouped[row.subject].push(row);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-950 text-gray-100 px-0 pb-8 pt-0 sm:pt-0 max-w-md mx-auto">
      {/* Sticky Header for mobile */}
      <header className="sticky top-0 z-20 bg-gray-950/90 backdrop-blur shadow-md py-4 px-4 flex flex-col items-center border-b border-gray-800">
        <div className="flex w-full items-center justify-between">
          <Link href="/">
            <button className="px-3 py-2 bg-gray-800 text-purple-200 rounded-lg shadow hover:bg-purple-800 hover:text-white transition-all text-xs font-semibold border border-purple-700">
              ← Home
            </button>
          </Link>
          <h2 className="text-lg font-bold text-purple-300 drop-shadow text-center flex-1">Progress</h2>
          <div className="w-16" /> {/* Spacer for symmetry */}
        </div>
      </header>
      <div className="px-2 pt-4">
        <div className="mb-4 flex items-center gap-4 justify-center">
          <span className="font-semibold text-gray-300 text-sm">Sort by Mastery:</span>
          <button
            className={`px-3 py-1 rounded font-bold text-xs ${sortOrder === "desc" ? "bg-purple-700 text-white" : "bg-gray-800 text-purple-200"}`}
            onClick={() => setSortOrder("desc")}
          >
            High → Low
          </button>
          <button
            className={`px-3 py-1 rounded font-bold text-xs ${sortOrder === "asc" ? "bg-purple-700 text-white" : "bg-gray-800 text-purple-200"}`}
            onClick={() => setSortOrder("asc")}
          >
            Low → High
          </button>
        </div>
        {/* Table per subject */}
        {Object.keys(grouped).length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-base">No subjects or topics found.</div>
        ) : (
          Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([subject, rows]) => (
              <div key={subject} className="mb-8">
                <h3 className="text-lg font-bold text-purple-200 mb-2 px-2">{subject}</h3>
                <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-950/90 shadow-lg">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-900 text-purple-200">
                        <th className="p-3 text-left">Topic</th>
                        <th className="p-3 text-right">Mastery</th>
                        <th className="p-3 text-center">&nbsp;</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-4 text-center text-gray-400">No topics found.</td>
                        </tr>
                      ) : (
                        rows.map((row, idx) => (
                          <tr key={idx} className="border-t border-gray-800 hover:bg-gray-900/60">
                            <td className="p-3 text-gray-200 max-w-[120px] truncate">{row.topic}</td>
                            <td className="p-3 text-right text-green-300 font-mono text-base">{row.count}</td>
                            <td className="p-3 text-center">
                              <Link
                                href={`/quiz/${row.subjectSlug}/${encodeURIComponent(row.topic)}`}
                                className="inline-block px-3 py-1 bg-gradient-to-r from-purple-700 to-indigo-700 text-white rounded-lg font-bold text-xs shadow hover:from-purple-800 hover:to-indigo-800 hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500"
                              >
                                Start
                              </Link>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
        )}
      </div>
    </main>
  );
}
