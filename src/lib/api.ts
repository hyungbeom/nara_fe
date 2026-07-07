import type { ApiResponse, LoginRequest, LoginUser } from "@/types/auth";
import type { BidDetail, BidFavorite, BidSearchPage, BidSearchRequest } from "@/types/bid";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
  } catch {
    throw new Error("서버에 연결할 수 없습니다. 백엔드(8080)와 프론트(3000)가 실행 중인지 확인해 주세요.");
  }

  let body: ApiResponse<T>;

  const responseText = await response.text();

  try {
    body = JSON.parse(responseText) as ApiResponse<T>;
  } catch {
    const snippet = responseText.trim().slice(0, 120);
    throw new Error(
      snippet
        ? `서버 응답을 처리할 수 없습니다. (HTTP ${response.status}: ${snippet})`
        : `서버 응답을 처리할 수 없습니다. (HTTP ${response.status}, 빈 응답)`
    );
  }

  if (!response.ok || !body.success) {
    throw new Error(body.message || "요청에 실패했습니다.");
  }

  return body.data as T;
}

export function login(payload: LoginRequest) {
  return request<LoginUser>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getCurrentUser() {
  return request<LoginUser>("/api/auth/me");
}

export function logout() {
  return request<null>("/api/auth/logout", {
    method: "POST",
  });
}

export function searchBids(payload: BidSearchRequest) {
  return request<BidSearchPage>("/api/bids/search", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getBidDetail(
  bidNo: string,
  bidOrd: string,
  announceDate: string,
  industryCode?: string,
  industryName?: string
) {
  const params = new URLSearchParams({ bidOrd, announceDate });
  if (industryCode) {
    params.set("industryCode", industryCode);
  }
  if (industryName) {
    params.set("industryName", industryName);
  }
  return request<BidDetail>(`/api/bids/${encodeURIComponent(bidNo)}?${params.toString()}`);
}

export function getBidFavorites() {
  return request<BidFavorite[]>("/api/bids/favorites");
}

export function checkBidFavorite(bidNo: string, bidOrd: string, announceDate: string) {
  const params = new URLSearchParams({ bidNo, bidOrd, announceDate });
  return request<{ favorited: boolean }>(`/api/bids/favorites/check?${params.toString()}`);
}

export function addBidFavorite(bid: BidFavorite | Omit<BidFavorite, "favoriteSeq" | "createdAt">) {
  return request<null>("/api/bids/favorites", {
    method: "POST",
    body: JSON.stringify({
      bidNo: bid.bidNo,
      bidOrd: bid.bidOrd,
      announceDate: bid.announceDate,
      bidName: bid.bidName,
      industry: bid.industry,
      contractMethod: bid.contractMethod,
      openingDate: bid.openingDate,
      estimatedPrice: bid.estimatedPrice,
      agency: bid.agency,
      detailUrl: bid.detailUrl,
    }),
  });
}

export function removeBidFavorite(bidNo: string, bidOrd: string, announceDate: string) {
  const params = new URLSearchParams({ bidNo, bidOrd, announceDate });
  return request<null>(`/api/bids/favorites?${params.toString()}`, {
    method: "DELETE",
  });
}
