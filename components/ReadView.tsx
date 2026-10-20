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
              <p className="message-text">불러오는 중입니다…</p>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="paper-wrap">
            <div className="paper paper-message">
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
            <div className="paper-wrap">
              <div
                className="paper"
                onPointerDown={onPointerDown}
                onPointerUp={onPointerUp}
                onPointerCancel={() => (pointer.current = null)}
              >
                <div
                  key={current.id}
                  className={`paper-content enter-${dir}`}
                  aria-live="polite"
                >
                  <p className="paper-lead">혹시 모르니까,</p>
                  <p className="paper-body">나는 {displayText(current.content)}</p>
                </div>
                <p className="paper-count" aria-label={`${count}개 중 ${index + 1}번째 기록`}>
                  {index + 1} / {count}
                </p>
              </div>
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
                aria-pressed={playing}
              >
                {playing ? "자동 전환 멈춤" : "자동 전환 재생"}
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
