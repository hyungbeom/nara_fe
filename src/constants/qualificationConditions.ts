export const COMPANY_BUSINESS_TYPE = "소프트웨어사업자(컴퓨터관련서비스사업)(1468)";
export const MAX_SINGLE_PROJECT_CONTRACT_AMOUNT = 40_000_000;
export const COMPANY_FOUNDING_YEARS = "3년 미만";

export const COMPANY_DIRECT_PRODUCTION_CERTIFICATES = [
  { code: "8111179901", name: "정보인프라구축서비스" },
  { code: "8111159901", name: "정보시스템개발서비스" },
  { code: "8111181101", name: "운영위탁서비스" },
  { code: "8111189901", name: "정보시스템유지관리서비스" },
  { code: "8111229901", name: "소프트웨어유지및지원서비스" },
] as const;

export type QualificationSupportCondition = {
  id: string;
  title: string;
  description: string;
};

const directProductionCertificateList = COMPANY_DIRECT_PRODUCTION_CERTIFICATES.map(
  (item) => `- ${item.code} ${item.name}`
).join("\n");

export const QUALIFICATION_SUPPORT_CONDITIONS: QualificationSupportCondition[] = [
  {
    id: "seoul_corporate",
    title: "법인 사업자 소재지(서울특별시)",
    description:
      "본사(사업자등록증상 소재지)가 서울특별시여도 입찰/제안 참여에 문제가 없는지 확인합니다. 지역제한, 참가자격, 공고 조건, 과업지시서, 입찰공고문 등을 근거로 판단합니다.",
  },
  {
    id: "software_business_type",
    title: "업종(소프트웨어사업자·1468)",
    description: `보유 업종이 "${COMPANY_BUSINESS_TYPE}" 하나뿐일 때 참여 가능한지 확인합니다. 입찰/제안의 참가자격, 업종·면허·등록 요건, 과업 범위를 근거로 판단하며, 요구 업종과 불일치하거나 추가 업종이 필요하면 부적격입니다.`,
  },
  {
    id: "direct_production_certificate",
    title: "직접생산증명서",
    description: `보유 직접생산증명서:\n${directProductionCertificateList}\n\n입찰/제안 참가자격에서 요구하는 직접생산증명 항목(분류번호·품명)을 위 목록으로 충족할 수 있는지 확인합니다. 요구 항목이 보유 목록에 없거나 추가 증명이 필요하면 부적격입니다.`,
  },
  {
    id: "single_project_contract_limit",
    title: "단일 프로젝트 최고 거래금액(4천만원)",
    description: `우리 회사의 단일 프로젝트 최고 거래금액(실적)은 ${(MAX_SINGLE_PROJECT_CONTRACT_AMOUNT / 10_000_000).toFixed(0)}천만원입니다. 계약 가능 한도가 아니라, 지금까지 단일 프로젝트로 거래한 최대 금액입니다. 공고의 추정가격·예산·실적 요건 등이 이 실적을 초과하면 부적격입니다.`,
  },
  {
    id: "company_founding_period",
    title: "창업 기간(3년 미만)",
    description: `창업한 지 ${COMPANY_FOUNDING_YEARS}입니다. 참가자격의 업력·경력·실적·창업 후 경과연수 요건을 근거로 참여 가능한지 확인합니다. 요건을 충족하지 못하면 부적격입니다.`,
  },
];
