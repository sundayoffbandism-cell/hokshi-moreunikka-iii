import { supabase } from "./supabase";

export type RecordItem = {
  id: string;
  content: string;
  created_at: string;
};

export const MAX_LEN = 100;
const FETCH_LIMIT = 500;

/** 줄바꿈·연속 공백을 하나의 공백으로 정리합니다. */
export function normalize(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

export function newToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // randomUUID 를 쓸 수 없는 환경을 위한 대체
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export type CreateResult =
  | { ok: true; record: RecordItem | null }
  | { ok: false; message: string };

export async function createRecord(
  content: string,
  token: string
): Promise<CreateResult> {
  if (!supabase) {
    return {
      ok: false,
      message: "서버 연결이 설정되지 않아 저장할 수 없습니다. 잠시 후 다시 시도해 주세요.",
    };
  }
  try {
    const { data, error } = await supabase
      .from("records")
      .insert({ content, client_token: token })
      .select("id, content, created_at")
      .single();

    if (error) {
      // 같은 토큰으로 이미 저장된 경우: 중복 제출이므로 성공으로 처리합니다.
      if (error.code === "23505") return { ok: true, record: null };
      return {
        ok: false,
        message: "저장하지 못했습니다. 네트워크를 확인하고 다시 시도해 주세요.",
      };
    }
    return { ok: true, record: data as RecordItem };
  } catch {
    return {
      ok: false,
      message: "저장하지 못했습니다. 네트워크를 확인하고 다시 시도해 주세요.",
    };
  }
}

/** 숨김 처리되지 않은 기록을 최신순으로 가져옵니다. 실패하면 예외를 던집니다. */
export async function fetchRecords(): Promise<RecordItem[]> {
  if (!supabase) throw new Error("not-configured");
  const { data, error } = await supabase
    .from("records")
    .select("id, content, created_at")
    .order("created_at", { ascending: false })
    .limit(FETCH_LIMIT);
  if (error) throw error;
  return (data ?? []) as RecordItem[];
}
