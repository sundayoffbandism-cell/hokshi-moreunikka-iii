import type { RecordItem } from "./records";

/**
 * 표시 순서 (D 방식)
 * 1) 방금 내가 남긴 기록이 있으면 첫 카드로 둡니다.
 * 2) 나머지는 무작위로 섞되, 최근 기록일수록 앞쪽에 올 확률이 높습니다.
 *    (가장 새로운 기록의 가중치 3, 가장 오래된 기록의 가중치 1)
 *    한 바퀴를 도는 동안 같은 기록은 반복되지 않습니다.
 *
 * records 는 최신순(내림차순)으로 들어온다고 가정합니다.
 */
export function buildQueue(
  records: RecordItem[],
  firstId?: string
): RecordItem[] {
  const n = records.length;
  const keyed = records.map((rec, i) => {
    const weight = 1 + 2 * (1 - i / Math.max(1, n - 1));
    // Efraimidis–Spirakis 가중 무작위 추출
    const key = Math.pow(Math.random(), 1 / weight);
    return { rec, key };
  });
  keyed.sort((a, b) => b.key - a.key);
  const queue = keyed.map((k) => k.rec);

  if (firstId) {
    const at = queue.findIndex((r) => r.id === firstId);
    if (at > 0) {
      const [mine] = queue.splice(at, 1);
      queue.unshift(mine);
    }
  }
  return queue;
}

/**
 * 새로 불러온 목록을 현재 큐에 반영합니다.
 * - 현재 카드와 이미 본 카드(0..currentIndex)는 그대로 둡니다.
 * - 아직 안 본 카드 중 삭제/숨김된 것은 제거합니다.
 * - 새로 생긴 기록은 아직 안 본 구간의 임의 위치에 끼워 넣습니다.
 */
export function mergeQueue(
  queue: RecordItem[],
  fresh: RecordItem[],
  currentIndex: number
): RecordItem[] {
  const freshIds = new Set(fresh.map((r) => r.id));
  const known = new Set(queue.map((r) => r.id));

  const seen = queue.slice(0, currentIndex + 1);
  const upcoming = queue
    .slice(currentIndex + 1)
    .filter((r) => freshIds.has(r.id));

  const added = fresh.filter((r) => !known.has(r.id));
  for (const rec of added) {
    const at = Math.floor(Math.random() * (upcoming.length + 1));
    upcoming.splice(at, 0, rec);
  }

  const next = [...seen, ...upcoming];
  const unchanged =
    next.length === queue.length && next.every((r, i) => r.id === queue[i].id);
  return unchanged ? queue : next;
}
