"use client";

import { useRef, useState } from "react";
import {
  MAX_LEN,
  createRecord,
  newToken,
  normalize,
  type RecordItem,
} from "@/lib/records";

type Props = {
  onSaved: (record: RecordItem | null) => void;
  onBrowse: () => void;
};

export default function WriteView({ onSaved, onBrowse }: Props) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 상태 업데이트보다 빠른 연타를 막기 위한 잠금
  const lock = useRef(false);
  // 한 번의 제출(재시도 포함)에는 같은 토큰을 사용합니다.
  const token = useRef<string>(newToken());

  const clean = normalize(text);
  const canSubmit = clean.length > 0 && clean.length <= MAX_LEN && !submitting;

  async function submit() {
    if (lock.current || clean.length === 0 || clean.length > MAX_LEN) return;
    lock.current = true;
    setSubmitting(true);
    setError(null);

    const result = await createRecord(clean, token.current);
    if (result.ok) {
      onSaved(result.record); // 화면이 전환되므로 잠금은 그대로 둡니다.
    } else {
      setError(result.message);
      setSubmitting(false);
      lock.current = false;
    }
  }

  return (
    <main className="view view-write">
      <div className="write-wrap">
        <header className="write-head">
          <p className="write-eyebrow">혹시 모르니까 iii</p>
          <h1 className="write-title">당신의 ‘혹시 모르니까’는 무엇인가요?</h1>
          <p className="write-desc">누구에게나 혹시나 하는 마음이 있습니다.</p>
        </header>

        <hr className="write-rule" />

        <form
          className="write-form"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <label className="write-label" htmlFor="record">
            혹시 모르니까, 나는 <span className="blank" aria-hidden="true" />.
          </label>

          <textarea
            id="record"
            className="write-input"
            rows={3}
            maxLength={MAX_LEN}
            value={text}
            disabled={submitting}
            placeholder="예: 중요한 날에는 꼭 같은 펜을 가져간다."
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              // 한글 조합 중 Enter 는 무시하고, 그 외 Enter 는 제출합니다.
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                void submit();
              }
            }}
            aria-describedby="count"
          />

          <p className="write-count" id="count">
            {text.length} / {MAX_LEN}
          </p>

          <button
            type="submit"
            className="write-button"
            disabled={!canSubmit}
          >
            {submitting ? "남기는 중…" : "내 ‘혹시 모르니까’ 남기기"}
          </button>

          <p className="write-error" role="alert" aria-live="assertive">
            {error}
          </p>
        </form>

        <button
          type="button"
          className="write-link"
          onClick={onBrowse}
          disabled={submitting}
        >
          다른 사람의 ‘혹시 모르니까’ 구경하기
        </button>
      </div>
    </main>
  );
}
