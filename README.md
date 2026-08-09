# NAJJUBTYPE — Supabase 공용 DB 버전

기존 NAJJUBTYPE의 정적 Vercel 구조와 포스타입형 UI를 유지하면서 하트, 댓글, 명대사 추천, 추천 이유, 소트 결과와 전체 랭킹을 Supabase 공용 데이터로 바꾼 버전입니다.

## 적용 순서

1. Supabase에서 새 프로젝트를 만듭니다.
2. Supabase Authentication 설정에서 **Anonymous Sign-Ins**를 활성화합니다.
3. Supabase **SQL Editor**에서 [`supabase/schema.sql`](./supabase/schema.sql) 전체를 실행합니다.
4. Supabase 프로젝트의 URL과 **Publishable key**를 [`config.js`](./config.js)에 입력합니다.

```js
window.NAJJUBTYPE_CONFIG = {
  supabaseUrl: 'https://프로젝트-ref.supabase.co',
  supabasePublishableKey: 'sb_publishable_...'
};
```

`service_role` 키는 절대로 브라우저 파일에 넣지 마세요. 이 프로젝트에는 공개 사용을 전제로 한 Publishable key 또는 기존 anon key만 사용합니다.

5. 이 폴더의 파일을 현재 Vercel 프로젝트 루트에 그대로 올립니다. 별도 빌드 명령은 필요 없습니다.
6. Vercel을 다시 배포한 뒤 일반 창과 시크릿 창을 동시에 열어 하트·댓글이 양쪽에 반영되는지 확인합니다.

## 데이터 이전

기존 사이트를 사용한 브라우저에서 새 버전을 처음 열면 다음 `localStorage` 데이터를 한 번만 공용 DB로 옮깁니다.

- 사용자가 등록한 명대사와 추천 이유
- 사용자가 누른 하트
- 사용자가 작성한 댓글
- 사용자의 소트 최종 순위와 우승 결과

기존 `sortHistory`에는 개별 대결의 승자·패자 조합이 저장돼 있지 않습니다. 따라서 과거 소트의 **최종 순위와 우승 기록**은 이전하지만, 과거 승·패 횟수는 추측해서 만들지 않습니다. 새 버전에서 완료한 소트부터 승·패가 정확히 공용 집계됩니다.

북마크는 개인 기능이므로 계속 해당 브라우저의 `localStorage`에만 저장됩니다.

## 익명 사용자 방식의 범위

화면에는 회원가입이나 로그인 단계가 없습니다. 첫 방문 때 Supabase가 익명 사용자 ID를 만들고 같은 브라우저 프로필에 세션을 보관합니다. `(post_id, user_id)` 복합 기본키 때문에 같은 익명 사용자는 게시물당 하트를 한 번만 누를 수 있고, 다시 누르면 취소됩니다.

익명 사용자는 브라우저 데이터를 지우거나 다른 기기·브라우저를 사용하면 같은 ID로 돌아올 수 없습니다. 따라서 회원가입 없이 “한 사람”을 기기 밖까지 영구 식별하는 것은 불가능하며, 이 구현의 1인 1하트 범위는 **동일한 익명 세션**입니다.

## 파일 구조

```text
index.html                 기존 정적 화면 구조
style.css                  기존 UI 스타일
app.js                     Supabase 데이터·실시간·소트 로직
config.js                  프로젝트 URL/Publishable key
assets/                    기존 폰트·기본 아바타
vendor/supabase.js         @supabase/supabase-js 2.112.2 UMD 배포본
supabase/schema.sql        테이블·RLS·트리거·RPC·시드 데이터
DB_DESIGN.md               스키마와 권한 설계 설명
vercel.json                정적 배포 헤더 설정
```

## 점검 항목

- 새 브라우저에서 회원가입 화면 없이 피드가 열리는가
- A 창에서 누른 하트 수가 B 창에 실시간 또는 새로고침 후 보이는가
- 한 창에서 하트를 다시 누르면 취소되는가
- 댓글 내용은 댓글 아이콘을 눌러야만 펼쳐지는가
- 추천 이유 회색 박스는 댓글 영역과 무관하게 항상 보이는가
- 사용자 등록 글이 다른 창에서도 보이는가
- 소트 완료 후 우승·승·패가 전체 랭킹에 반영되는가
- 등록한 본인 글만 수정·삭제 메뉴가 보이는가

## 공식 문서

- [Supabase Anonymous Sign-Ins](https://supabase.com/docs/guides/auth/auth-anonymous)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)

