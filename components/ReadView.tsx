"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchRecords, type RecordItem } from "@/lib/records";
import { buildQueue, mergeQueue } from "@/lib/order";

type Props = {
  ownId?: string;
  onWrite: () => void;
};

type Status = "loading" | "error" | "ready";
type Direction = "next" | "prev";

const AUTO_MS = 3000; // 자동 전환 기본 간격
const AFTER_MANUAL_MS = 6000; // 직접 넘긴 뒤 자동 전환이 다시 이어지기까지의 간격
const POLL_MS = 20000; // 새 기록을 확인하는 주기
const SWIPE_PX = 45;

/** 문장이 구두점으로 끝나지 않으면 마침표를 붙여 보여줍니다. (저장된 값은 바꾸지 않습니다.) */
function displayText(content: string): string {
  return /[.!?…~。]$/.test(content) ? content : `${content}.`;
}

/** 긴 문장은 읽을 시간을 조금 더 줍니다. (기본 3초, 최대 +2초) */
function dwellMs(content: string): number {
  const extra = Math.min(2000, Math.max(0, content.length - 40) * 35);
  return AUTO_MS + extra;
}

/** 기록을 남긴 날짜 (한국 시간 기준) 예: 2026. 10. 20 */
function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}. ${get("month")}. ${get("day")}`;
}

/** 카드마다 아주 살짝 다르게 놓인 느낌을 주는 기울기 (-0.8° ~ 0.8°, 같은 기록은 항상 같은 각도) */
function tiltFor(id: string): number {
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum = (sum + id.charCodeAt(i)) % 97;
  return ((sum % 9) - 4) * 0.2;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** 글이 길수록 손글씨 크기를 조금 줄여서 카드 안에 편안히 담습니다. */
function sizeClass(length: number): string {
  if (length > 70) return "is-long";
  if (length > 40) return "is-mid";
  return "is-short";
}

export default function ReadView({ ownId, onWrite }: Props) {
  const [status, setStatus] = useState<Status>("loading");
  const [queue, setQueue] = useState<RecordItem[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [dir, setDir] = useState<Direction>("next");
  const [nonce, setNonce] = useState(0); // 타이머를 다시 시작시키는 용도

  const indexRef = useRef(0);
  indexRef.current = index;
  const manualRef = useRef(false);
  const pointer = useRef<{ x: number; y: number } | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const records = await fetchRecords();
      setQueue(buildQueue(records, ownId));
      setIndex(0);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [ownId]);

  useEffect(() => {
    void load();
  }, [load]);

  // 새 기록 반영: 주기적으로 확인해 아직 보지 않은 구간에 끼워 넣습니다.
  useEffect(() => {
    if (status !== "ready") return;
    const id = window.setInterval(async () => {
      try {
        const fresh = await fetchRecords();
        setQueue((q) => {
          if (q.length === 0) return buildQueue(fresh, ownId);
          return mergeQueue(q, fresh, indexRef.current);
        });
      } catch {
        // 일시적인 오류는 무시하고 현재 카드를 계속 보여줍니다.
      }
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [status, ownId]);

  const count = queue.length;

  const go = useCallback(
    (delta: 1 | -1, manual: boolean) => {
      if (count < 2) return;
      manualRef.current = manual;
      setDir(delta > 0 ? "next" : "prev");
      setIndex((i) => (i + delta + count) % count);
      setNonce((n) => n + 1);
    },
    [count]
  );

  // 자동 전환
  useEffect(() => {
    if (status !== "ready" || !playing || count < 2) return;
    const current = queue[index];
    const delay = manualRef.current
      ? AFTER_MANUAL_MS
      : current
        ? dwellMs(current.content)
        : AUTO_MS;
    const id = window.setTimeout(() => go(1, false), delay);
    return () => window.clearTimeout(id);
  }, [status, playing, count, index, nonce, queue, go]);

  // 키보드 좌우 방향키
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") go(1, true);
      if (e.key === "ArrowLeft") go(-1, true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  function onPointerDown(e: React.PointerEvent) {
    pointer.current = { x: e.clientX, y: e.clientY };
  }
  function onPointerUp(e: React.PointerEvent) {
    const start = pointer.current;
    pointer.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
      go(dx < 0 ? 1 : -1, true); // 왼쪽으로 밀면 다음, 오른쪽으로 밀면 이전
    }
  }

  const current = queue[index];

  return (
    <main className="view view-read">
      <div className="desk">
        {status === "loading" && (
          <div className="paper-wrap">
            <div className="paper paper-message" aria-busy="true">
              <span className="hole" aria-hidden="true" />
              <p className="message-text">불러오는 중입니다…</p>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="paper-wrap">
            <div className="paper paper-message">
              <span className="hole" aria-hidden="true" />
              <p className="message-text" role="alert">
                기록을 불러오지 못했습니다.
                <br />
                네트워크를 확인하고 다시 시도해 주세요.
              </p>
              <div className="message-actions">
                <button type="button" className="ghost-button" onClick={() => void load()}>
                  다시 불러오기
                </button>
                <button type="button" className="ghost-button" onClick={onWrite}>
                  내 ‘혹시 모르니까’ 남기기
                </button>
              </div>
            </div>
          </div>
        )}

        {status === "ready" && count === 0 && (
          <div className="paper-wrap">
            <div className="paper paper-message">
              <span className="hole" aria-hidden="true" />
              <p className="message-text">
                아직 남겨진 이야기가 없습니다.
                <br />
                당신의 혹시 모르니까를 가장 먼저 남겨주세요.
              </p>
              <div className="message-actions">
                <button type="button" className="ghost-button" onClick={onWrite}>
                  내 ‘혹시 모르니까’ 남기기
                </button>
              </div>
            </div>
          </div>
        )}

        {status === "ready" && count > 0 && current && (
          <>
            <p className="sr-only" aria-live="polite">
              {`${count}개 중 ${index + 1}번째 기록. 혹시 모르니까, 나는 ${displayText(current.content)}`}
            </p>

            {/* key 가 바뀌면 카드 한 장이 새로 놓이면서 부드럽게 들어옵니다. */}
            <div
              key={current.id}
              className={`paper-wrap enter-${dir}`}
              style={{ "--tilt": `${tiltFor(current.id)}deg` } as React.CSSProperties}
            >
              <article
                className="paper"
                onPointerDown={onPointerDown}
                onPointerUp={onPointerUp}
                onPointerCancel={() => (pointer.current = null)}
              >
                <span className="hole" aria-hidden="true" />

                <header className="paper-head" aria-hidden="true">
                  <span className="tag">혹시 모르니까 iii</span>
                  <span className="tag tag-count">
                    {pad(index + 1)} / {pad(count)}
                  </span>
                </header>

                <section className="field field-main" aria-hidden="true">
                  <p className="field-label">혹시 모르니까,</p>
                  <p className={`hand ${sizeClass(current.content.length)}`}>
                    나는 {displayText(current.content)}
                  </p>
                </section>

                <section className="field field-date" aria-hidden="true">
                  <p className="field-label">남긴 날</p>
                  <p className="hand hand-date">{formatDate(current.created_at)}</p>
                </section>
              </article>
            </div>

            <nav className="controls" aria-label="기록 넘기기">
              <button
                type="button"
                className="text-button"
                onClick={() => go(-1, true)}
                disabled={count < 2}
              >
                이전
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => setPlaying((p) => !p)}
                disabled={count < 2}
                aria-label={playing ? "자동 전환 멈춤" : "자동 전환 재생"}
              >
                {playing ? "멈춤" : "재생"}
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => go(1, true)}
                disabled={count < 2}
              >
                다음
              </button>
            </nav>

            <button type="button" className="desk-link" onClick={onWrite}>
              내 ‘혹시 모르니까’ 남기기
            </button>
          </>
        )}
      </div>
    </main>
  );
}
