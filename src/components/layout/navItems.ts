export type NavItem = {
  label: string;
  href: string;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "대시보드", href: "/dashboard" },
  { label: "공고검색", href: "/bids/search" },
  { label: "내 공고리스트", href: "/my-bids" },
  { label: "구글드라이브", href: "/google-drive" },
];
