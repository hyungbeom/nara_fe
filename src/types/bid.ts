export type ContractMethod = "전체" | "일반경쟁" | "지명경쟁" | "제한경쟁" | "수의계약";

export type DateQueryType = "announceDate" | "openingDate";

export const DEFAULT_INDUSTRY_NAME = "소프트웨어사업자(컴퓨터관련서비스사업)";
export const DEFAULT_INDUSTRY_CODE = "1468";

export interface BidSearchRequest {
  bidName?: string;
  industry?: string;
  industryCode?: string;
  contractMethod: ContractMethod;
  dateType?: DateQueryType;
  startDate: string;
  endDate: string;
  minPrice?: number;
  maxPrice?: number;
  pageNo?: number;
  pageSize?: number;
}

export interface BidAttachment {
  fileName: string;
  fileUrl: string;
}

export interface BidDetail {
  bidNo: string;
  bidName: string;
  industry: string;
  contractMethod: string;
  announceDate: string;
  estimatedPrice: number;
  budgetAmount: number;
  agency: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  regionRestriction: string;
  industryRestriction: string;
  demandAgency: string;
  detailUrl?: string;
  bidCloseDate: string;
  bidBeginDate: string;
  qualificationDeadline: string;
  openingDate: string;
  successBidMethod: string;
  bidMethod: string;
  detailContent: string;
  attachments: BidAttachment[];
}

export interface BidSearchPage {
  items: BidSearchResult[];
  totalCount: number;
  fetchedCount: number;
  pageNo: number;
  pageSize: number;
  truncated: boolean;
  countApproximate?: boolean;
}

export interface BidSearchResult {
  bidNo: string;
  bidOrd: string;
  bidName: string;
  industry: string;
  contractMethod: string;
  announceDate: string;
  openingDate: string;
  estimatedPrice: number;
  agency: string;
  detailUrl?: string;
}

export interface BidFavorite extends BidSearchResult {
  favoriteSeq: number;
  createdAt: string;
}

export const CONTRACT_METHODS: ContractMethod[] = [
  "전체",
  "일반경쟁",
  "지명경쟁",
  "제한경쟁",
  "수의계약",
];
