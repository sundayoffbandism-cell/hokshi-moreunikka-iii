"use client";

import { useState } from "react";
import WriteView from "@/components/WriteView";
import ReadView from "@/components/ReadView";

type View = "write" | "read";

export default function Home() {
  const [view, setView] = useState<View>("write");
  // 방금 내가 남긴 기록의 id (두 번째 화면에서 첫 카드로 보여줍니다)
  const [ownId, setOwnId] = useState<string | undefined>(undefined);

  if (view === "write") {
    return (
      <WriteView
        onSaved={(record) => {
          setOwnId(record?.id);
          setView("read");
        }}
        onBrowse={() => {
          setOwnId(undefined);
          setView("read");
        }}
      />
    );
  }

  return <ReadView ownId={ownId} onWrite={() => setView("write")} />;
}
