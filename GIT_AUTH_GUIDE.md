# Git 인증 설정 가이드

## 현재 상황
- 원격 저장소: `https://github.com/suhsuhz/study-next.git`
- 오류: "Invalid username or token. Password authentication is not supported for Git operations."

## 해결 방법 (3가지)

### 방법 1: Personal Access Token (PAT) 사용 (추천)

#### 1단계: GitHub에서 Personal Access Token 생성
1. GitHub에 로그인
2. 우측 상단 프로필 클릭 → **Settings**
3. 왼쪽 메뉴에서 **Developer settings** 클릭
4. **Personal access tokens** → **Tokens (classic)** 클릭
5. **Generate new token** → **Generate new token (classic)** 클릭
6. 설정:
   - **Note**: `Git Operations` (설명)
   - **Expiration**: 원하는 기간 선택 (90 days, 1 year 등)
   - **Scopes**: 최소한 `repo` 체크 (전체 레포지토리 접근)
7. **Generate token** 클릭
8. **생성된 토큰을 복사해 안전한 곳에 보관** (다시 볼 수 없음!)

#### 2단계: Git Credential Manager 설정 (Windows)
```powershell
# Git Credential Manager 설정
git config --global credential.helper manager-core
```

#### 3단계: 저장소에 푸시/풀 시도
```powershell
# 다음 명령어 실행 시 사용자 이름과 비밀번호 입력 창이 나타남
git pull
# 또는
git push
```

**입력 정보:**
- **Username**: GitHub 사용자명 (`suhsuhz`)
- **Password**: 위에서 생성한 **Personal Access Token** (비밀번호가 아님!)

#### 4단계: 인증 정보 저장 확인
한 번 인증하면 Windows Credential Manager에 저장되어 다음부터는 자동으로 사용됩니다.

---

### 방법 2: URL에 토큰 직접 포함 (임시 방법)

⚠️ 보안상 권장하지 않지만, 빠르게 테스트할 때 사용 가능

```powershell
# 원격 저장소 URL을 토큰 포함 URL로 변경
git remote set-url origin https://YOUR_TOKEN@github.com/suhsuhz/study-next.git

# 예시 (실제 토큰으로 교체 필요)
# git remote set-url origin https://ghp_xxxxxxxxxxxxxxxxxxxx@github.com/suhsuhz/study-next.git
```

⚠️ 주의: 이 방법은 `.git/config` 파일에 토큰이 평문으로 저장되므로 보안상 위험합니다.

---

### 방법 3: SSH 키 사용 (더 안전한 방법)

#### 1단계: SSH 키 생성
```powershell
# SSH 키 생성 (이미 있다면 건너뛰기)
ssh-keygen -t ed25519 -C "your_email@example.com"

# 엔터 키를 여러 번 눌러 기본값 사용
# 또는 키 파일 이름과 비밀번호 설정
```

#### 2단계: SSH 키를 GitHub에 등록
1. 생성된 공개 키 복사:
```powershell
# 공개 키 내용 확인
cat ~/.ssh/id_ed25519.pub
# 또는
type $env:USERPROFILE\.ssh\id_ed25519.pub
```

2. GitHub에 등록:
   - GitHub → Settings → SSH and GPG keys
   - **New SSH key** 클릭
   - **Title**: `My PC` (원하는 이름)
   - **Key**: 위에서 복사한 공개 키 붙여넣기
   - **Add SSH key** 클릭

#### 3단계: 원격 저장소 URL을 SSH로 변경
```powershell
# HTTPS → SSH로 변경
git remote set-url origin git@github.com:suhsuhz/study-next.git

# 변경 확인
git remote -v
```

#### 4단계: 연결 테스트
```powershell
# SSH 연결 테스트
ssh -T git@github.com

# "Hi suhsuhz! You've successfully authenticated..." 메시지가 나오면 성공
```

---

## 추천 순서

1. **방법 1 (PAT + Credential Manager)**: 가장 간단하고 Windows에서 잘 작동
2. **방법 3 (SSH)**: 더 안전하고 토큰 만료 걱정 없음
3. **방법 2 (URL 포함)**: 임시 테스트용 (프로덕션에서는 사용하지 말 것)

## 문제 해결

### Credential Manager가 작동하지 않는 경우
```powershell
# Git Credential Manager 재설정
git config --global --unset credential.helper
git config --global credential.helper manager-core

# Windows Credential Manager에서 기존 인증 정보 삭제
# 제어판 → 자격 증명 관리자 → Windows 자격 증명 → GitHub 관련 항목 삭제
```

### 토큰이 만료된 경우
- GitHub에서 새로운 토큰 생성 후 다시 인증

### 계속 인증이 실패하는 경우
```powershell
# 현재 설정 확인
git config --list | Select-String credential
git remote -v

# 자세한 로그로 다시 시도
GIT_TRACE=1 GIT_CURL_VERBOSE=1 git pull
```

