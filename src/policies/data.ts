export type CategoryId =
  "common" | "people" | "security" | "finance" | "production";
export type Article = {
  id: string;
  number: number;
  title: string;
  paragraphs: string[];
  items?: string[];
};
export type Chapter = { id: string; title: string; articles: Article[] };
export type Regulation = {
  id: string;
  number: string;
  code: string;
  title: string;
  category: CategoryId;
  summary: string;
  updatedAt: string;
  version: string;
  chapters: Chapter[];
  revisions: {
    date: string;
    version: string;
    title: string;
    description: string;
  }[];
};

export const categories: { id: CategoryId; name: string }[] = [
  { id: "common", name: "全社共通" },
  { id: "people", name: "人事・労務" },
  { id: "security", name: "情報セキュリティ" },
  { id: "finance", name: "経理・精算" },
  { id: "production", name: "営業・制作" },
];

// UI demonstration data only. These are NOT the company's approved regulations.
// Never replace with private company text while this repository is public.
export const regulations: Regulation[] = [
  {
    id: "employment",
    number: "01",
    code: "DEMO-HR-001",
    title: "就業規則",
    category: "people",
    summary: "働くうえでの基本的なルール、服務、勤務について。",
    updatedAt: "2026-08-01",
    version: "1.1",
    revisions: [
      {
        date: "2026-08-01",
        version: "1.1",
        title: "情報の取扱いに関する項目を追加",
        description:
          "第5条に、業務情報を外部サービスで扱う際の確認事項を追加した表示例です。実際の改定記録ではありません。",
      },
      {
        date: "2026-04-01",
        version: "1.0",
        title: "初版の表示例",
        description:
          "3章・6条で構成するサンプル規定です。実際の制定・施行日ではありません。",
      },
    ],
    chapters: [
      {
        id: "general",
        title: "総則",
        articles: [
          {
            id: "purpose",
            number: 1,
            title: "目的",
            paragraphs: [
              "この規則は、株式会社OneBe（以下「会社」という。）の社員の就業に関する基本的事項を定め、会社と社員が互いに信頼し、健全で創造的な職場環境をつくることを目的とする。",
            ],
          },
          {
            id: "scope",
            number: 2,
            title: "適用範囲",
            paragraphs: [
              "この規則は、会社に勤務するすべての社員に適用する。ただし、雇用形態または個別の労働契約により別段の定めがある場合は、その定めを優先する。",
            ],
          },
          {
            id: "compliance",
            number: 3,
            title: "規則の遵守",
            paragraphs: [
              "会社および社員は、この規則を遵守し、相互に協力して事業の発展と働きやすい環境の維持に努めるものとする。",
            ],
          },
        ],
      },
      {
        id: "conduct",
        title: "服務",
        articles: [
          {
            id: "duties",
            number: 4,
            title: "服務の基本",
            paragraphs: [
              "社員は、互いの専門性と人格を尊重し、誠実に業務を遂行する。業務上の判断に迷う場合は、担当責任者に相談する。",
            ],
            items: [
              "業務の進捗や課題は、関係者へ適切に共有する。",
              "会社や顧客の信用を損なう行為を行わない。",
              "安心して相談できる職場環境づくりに協力する。",
            ],
          },
          {
            id: "information",
            number: 5,
            title: "情報の取扱い",
            paragraphs: [
              "業務上知り得た会社および顧客の情報は、所定の方法に従って管理する。外部サービスや生成AIを利用する際は、入力する情報の機密性と社内の利用方針を確認する。",
              "情報の紛失・誤送信等に気づいた場合は、速やかに担当責任者へ報告する。",
            ],
          },
        ],
      },
      {
        id: "work",
        title: "勤務",
        articles: [
          {
            id: "hours",
            number: 6,
            title: "勤務時間",
            paragraphs: [
              "勤務時間、休憩および休日は、雇用契約および会社が別に定める内容に従う。勤怠は所定の方法で記録し、変更が必要な場合は事前に相談する。",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "security",
    number: "02",
    code: "DEMO-IS-001",
    title: "情報セキュリティ規程",
    category: "security",
    summary: "アカウント・端末・機密情報を安全に取り扱うために。",
    updatedAt: "2026-07-15",
    version: "1.0",
    revisions: [
      {
        date: "2026-07-15",
        version: "1.0",
        title: "初版の表示例",
        description: "情報セキュリティ規程のサンプルを登録した表示例です。",
      },
    ],
    chapters: [
      {
        id: "general",
        title: "総則",
        articles: [
          {
            id: "purpose",
            number: 1,
            title: "目的",
            paragraphs: [
              "会社および顧客から預かった情報を適切に保護し、安心して業務を行うための基本的な取扱いを定める。",
            ],
          },
          {
            id: "classification",
            number: 2,
            title: "情報の管理",
            paragraphs: [
              "情報は公開範囲を確認したうえで、会社が指定する保存先に保管する。外部に共有する際は、共有先と閲覧権限を確認する。",
            ],
          },
        ],
      },
      {
        id: "accounts",
        title: "アカウント・端末",
        articles: [
          {
            id: "account",
            number: 3,
            title: "アカウントの利用",
            paragraphs: [
              "業務用アカウントは本人が管理し、パスワードを他者と共有しない。利用可能なサービスでは多要素認証を設定する。",
            ],
          },
          {
            id: "incident",
            number: 4,
            title: "事故の報告",
            paragraphs: [
              "端末の紛失、不審なアクセスまたは情報漏えいの疑いが生じた場合は、速やかに担当責任者へ報告する。",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "expenses",
    number: "03",
    code: "DEMO-FN-001",
    title: "経費精算規程",
    category: "finance",
    summary: "経費の申請から証憑の保存、精算までの基本ルール。",
    updatedAt: "2026-06-20",
    version: "1.0",
    revisions: [
      {
        date: "2026-06-20",
        version: "1.0",
        title: "初版の表示例",
        description: "経費精算規程のサンプルを登録した表示例です。",
      },
    ],
    chapters: [
      {
        id: "general",
        title: "総則",
        articles: [
          {
            id: "purpose",
            number: 1,
            title: "目的",
            paragraphs: [
              "業務上必要な経費を適切に申請・精算し、記録を明確にするための基本的な手順を定める。",
            ],
          },
          {
            id: "scope",
            number: 2,
            title: "対象となる経費",
            paragraphs: [
              "業務との関連性が説明でき、会社が認めた支出を対象とする。対象や金額の判断に迷う場合は、支出前に担当責任者へ確認する。",
            ],
          },
        ],
      },
      {
        id: "process",
        title: "申請・精算",
        articles: [
          {
            id: "request",
            number: 3,
            title: "申請の方法",
            paragraphs: [
              "所定の申請方法に従い、利用日・金額・利用目的を記載する。",
            ],
            items: [
              "領収書等の証憑を添付する。",
              "案件に関係する経費は対象案件を記載する。",
              "申請内容に誤りがある場合は、速やかに修正する。",
            ],
          },
          {
            id: "receipt",
            number: 4,
            title: "証憑の保存",
            paragraphs: [
              "領収書等は会社が指定する方法で保存する。証憑を取得できない場合は、事情を添えて担当責任者へ相談する。",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "telework",
    number: "04",
    code: "DEMO-HR-002",
    title: "テレワーク規程",
    category: "people",
    summary: "場所にとらわれず、円滑に働くための取り決め。",
    updatedAt: "2026-06-10",
    version: "1.0",
    revisions: [
      {
        date: "2026-06-10",
        version: "1.0",
        title: "初版の表示例",
        description: "テレワーク規程のサンプルを登録した表示例です。",
      },
    ],
    chapters: [
      {
        id: "general",
        title: "総則",
        articles: [
          {
            id: "purpose",
            number: 1,
            title: "目的",
            paragraphs: [
              "テレワーク中の業務遂行、連絡および情報管理に関する基本的な事項を定める。",
            ],
          },
          {
            id: "application",
            number: 2,
            title: "利用の申請",
            paragraphs: [
              "テレワークを行う場合は、業務内容と実施場所を確認し、所定の方法で事前に相談する。",
            ],
          },
        ],
      },
      {
        id: "working",
        title: "勤務中の対応",
        articles: [
          {
            id: "contact",
            number: 3,
            title: "連絡・勤怠",
            paragraphs: [
              "勤務の開始・終了と休憩は所定の方法で記録する。勤務中は関係者と連絡が取れる状態を維持する。",
            ],
          },
          {
            id: "environment",
            number: 4,
            title: "作業環境",
            paragraphs: [
              "機密情報が第三者の目に触れない場所で作業し、端末から離れる際は画面をロックする。",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "client-information",
    number: "05",
    code: "DEMO-PR-001",
    title: "顧客情報取扱規程",
    category: "production",
    summary: "顧客からお預かりした情報・制作素材の取扱い。",
    updatedAt: "2026-04-01",
    version: "1.0",
    revisions: [
      {
        date: "2026-04-01",
        version: "1.0",
        title: "初版の表示例",
        description: "顧客情報取扱規程のサンプルを登録した表示例です。",
      },
    ],
    chapters: [
      {
        id: "general",
        title: "基本方針",
        articles: [
          {
            id: "purpose",
            number: 1,
            title: "目的",
            paragraphs: [
              "顧客から預かった情報および制作素材を、合意した業務の目的に沿って適切に取り扱う。",
            ],
          },
          {
            id: "sharing",
            number: 2,
            title: "保存・共有",
            paragraphs: [
              "資料は指定の案件フォルダに保存し、業務上必要な関係者に限って共有する。外部パートナーへ共有する場合は、共有範囲と条件を確認する。",
            ],
          },
        ],
      },
      {
        id: "publication",
        title: "公開・返却",
        articles: [
          {
            id: "portfolio",
            number: 3,
            title: "実績の公開",
            paragraphs: [
              "制作物や顧客名を実績として公開する際は、契約上の条件と顧客の許諾範囲を事前に確認する。",
            ],
          },
          {
            id: "return",
            number: 4,
            title: "業務終了時の対応",
            paragraphs: [
              "業務終了後の資料の保管・返却・削除は、顧客との合意および会社の方針に従う。",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "document-management",
    number: "06",
    code: "DEMO-GA-001",
    title: "文書管理規程",
    category: "common",
    summary: "文書の保存場所、版管理、公開範囲をそろえる。",
    updatedAt: "2026-04-01",
    version: "1.0",
    revisions: [
      {
        date: "2026-04-01",
        version: "1.0",
        title: "初版の表示例",
        description: "文書管理規程のサンプルを登録した表示例です。",
      },
    ],
    chapters: [
      {
        id: "general",
        title: "総則",
        articles: [
          {
            id: "purpose",
            number: 1,
            title: "目的",
            paragraphs: [
              "文書の保存と更新の方法を統一し、必要な情報を適切な状態で参照できるようにする。",
            ],
          },
          {
            id: "versions",
            number: 2,
            title: "版管理",
            paragraphs: [
              "作成中の文書と承認済みの文書を区別し、最新版と更新内容が分かるよう管理する。",
            ],
          },
        ],
      },
      {
        id: "access",
        title: "公開・見直し",
        articles: [
          {
            id: "approval",
            number: 3,
            title: "公開の確認",
            paragraphs: [
              "社内へ公開する前に、内容・公開範囲・適用開始日を担当責任者が確認する。",
            ],
          },
          {
            id: "review",
            number: 4,
            title: "定期的な見直し",
            paragraphs: [
              "文書の管理担当者は、運用の変更に合わせて内容を確認し、必要に応じて改定する。",
            ],
          },
        ],
      },
    ],
  },
];

export const dateLabel = (date: string) => date.replaceAll("-", ".");
export const categoryName = (id: CategoryId) =>
  categories.find((category) => category.id === id)!.name;
export const articlesOf = (rule: Regulation) =>
  rule.chapters.flatMap((chapter) => chapter.articles);
export const articleText = (article: Article) =>
  [article.title, ...article.paragraphs, ...(article.items ?? [])].join(" ");
export const normalize = (value: string) =>
  value.normalize("NFKC").toLocaleLowerCase("ja").trim();
export function searchRegulations(query: string) {
  const term = normalize(query);
  if (!term) return [];
  return regulations.flatMap((rule) => {
    const matches = articlesOf(rule).filter((article) =>
      normalize(articleText(article)).includes(term),
    );
    const titleMatch = normalize(rule.title).includes(term);
    return matches.length || titleMatch ? [{ rule, matches, titleMatch }] : [];
  });
}
