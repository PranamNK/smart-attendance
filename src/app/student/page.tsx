"use client";
import { useEffect, useMemo, useState } from "react";
type Record = { id: string; status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"; session: { heldAt: string; subject: { name: string }; class: { identifier: string } } };
export default function StudentDashboard() {
 const [records, setRecords] = useState<Record[]>([]); const [error, setError] = useState("");
 useEffect(() => { fetch("/api/attendance/history").then(async r => { const data = await r.json(); if (!r.ok) setError(data.error ?? "Unable to load attendance"); else setRecords(data.records); }); }, []);
 const present = useMemo(() => records.filter(record => record.status === "PRESENT").length, [records]); const percentage = records.length ? Math.round(present / records.length * 100) : 0;
 return <main className="app"><p className="eyebrow">STUDENT PORTAL</p><h1>My attendance</h1><section className="action"><div><span>Overall attendance</span><h2>{percentage}%</h2><p>{present} present of {records.length} confirmed sessions</p></div></section><section><h2>Attendance history</h2>{error && <p className="error">{error}</p>}{records.length === 0 && !error && <p>No confirmed attendance sessions yet.</p>}{records.map(record => <article className="row" key={record.id}><div><b>{record.session.subject.name}</b><span>{record.session.class.identifier} · {new Date(record.session.heldAt).toLocaleDateString()}</span></div><span className={`status ${record.status === "PRESENT" ? "MATCHED" : "UNKNOWN"}`}>{record.status}</span></article>)}</section></main>;
}
