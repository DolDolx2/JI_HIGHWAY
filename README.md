# JI HIGHWAY V1.0

모바일 우선 **고속도로 교통정보 웹앱**입니다. JI BUS와 동일하게 순수 HTML/CSS/JavaScript로 개발하며 GitHub와 Vercel을 사용합니다.

## 현재 구현 범위 (feature/v1.0-foundation)
- 인트로(0/3/5초), 반응형 홈, IC 검색 화면
- 3개 샘플 경로의 소통 결과 및 정체 필터
- 경로 지도 개념도, CCTV 플레이어 자리표시자
- 목적지 입력과 브라우저 GPS 권한 요청
- 즐겨찾기, 최근 조회, 설정 로컬 저장
- PWA manifest 및 Vercel 정적 배포 설정

> **중요:** 현재 교통/거리/시간/CCTV 정보는 개발용 예시입니다. 실제 경로 탐색과 CCTV 스트리밍은 API 연결 전까지 제공하지 않습니다. 운전 판단에 사용하지 마세요.

## 로컬 실행
정적 웹서버로 루트 디렉터리를 실행합니다. 예: `python -m http.server 8000`, 접속 `http://localhost:8000`.

## Vercel 연결
1. Vercel 새 프로젝트 → GitHub `DolDolx2/JI_HIGHWAY` 연결
2. Framework Preset: **Other**
3. Build Command: 비워두기, Output Directory: `.` (루트 정적 파일)
4. 우선 작업 브랜치 Preview 배포 검증; 검증·승인 후 `main` 병합
5. 실제 HTTPS 도메인 확정 후 CCTV API 신청 서비스 주소로 사용

## 기술 정책
- 프런트엔드 공개 코드에 API 비밀키 금지. Vercel 서버리스 프록시와 환경변수로 전환
- 지도 SDK 브라우저용 키는 제공사 도메인 제한 정책 확인
- 데이터 연동 전 서비스 주소, 호출량, CORS, 스트리밍 형식, 법적 사용조건 검증
- 사용자 입력을 DOM에 삽입할 때 HTML escape 적용
- 검색 불가 시 가짜 실시간 응답을 생성하지 않음

상세 로드맵: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)

디자인 및 개발 김정인
