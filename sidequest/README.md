# ⚡ UCU SideQuest

**UCU SideQuest** — це повнофункціональний веб-додаток для спільноти Українського Католицького Університету (УКУ), створений для пошуку однодумців для спонтанних активностей, дослідження університетських подій та змістовної підготовки до них.

Проєкт відповідає на 3 ключові питання студента:
1. **Що цікавого відбувається?** — централізована стрічка університетських подій та студентських ініціатив у стилі Meetup.
2. **З ким я можу піти?** — спонтанні SideQuests (кава, настільний теніс, прогулянки Стрийським парком, спільне розв'язання дедлайнів).
3. **Чому ця подія корисна та як підготуватися?** — структуровані розділи «Чому варто відвідати?», рекомендації щодо підготовки та профілі спікерів із посиланнями.

---

## 🏛️ Архітектура проєкту

Монорепозиторій містить чітко розділені компоненти:

```
sidequest/
├── backend/                  # FastAPI (Python 3.13), async SQLAlchemy 2, Pydantic v2
│   ├── alembic/              # Міграції бази даних (включно з підтримкою cognito_sub та auth_provider)
│   ├── app/
│   │   ├── api/v1/           # Версіоновані маршрути API (/auth, /me, /sidequests, /events, /organizations)
│   │   ├── models/           # SQLAlchemy 2 моделі таблиць
│   │   ├── schemas/          # Pydantic v2 схеми валідації запитів та відповідей
│   │   ├── repositories/     # Рівень доступу до даних (Repository Pattern)
│   │   ├── services/         # Бізнес-логіка, синхронізація Cognito, перевірка лімітів та прав доступу
│   │   └── utils/            # Безпека (bcrypt, локальні HS256 JWT + Cognito RS256 JWKS валідація)
│   ├── tests/                # Pytest набір інтеграційних, Cognito/Google та e2e тестів
│   ├── seed.py               # Ідемпотентний скрипт наповнення демонстраційними даними
│   ├── requirements.txt      # Залежності Python
│   └── Dockerfile
├── frontend/                 # Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
│   ├── app/                  # Сторінки та макети (включно з /login, /register та /auth/callback)
│   ├── components/           # UI компоненти (карточки SideQuest/Event, навігація, кнопка Google Sign-In)
│   ├── features/auth/        # Клієнтська автентифікація (Email/Password + Cognito OAuth 2.0 PKCE)
│   ├── lib/                  # Типізований API-клієнт (api.ts), OAuth PKCE клієнт (cognito.ts) та утиліти
│   ├── types/                # TypeScript визначення сутностей
│   ├── package.json
│   └── Dockerfile
├── infrastructure/           # Інфраструктура як код (AWS CloudFormation)
│   └── cognito-google-auth.yaml  # Шаблон Cognito User Pool, Hosted UI, Google IdP та App Client
├── docker-compose.yml        # Оркестрація локального стеку (Postgres 16 + Backend + Frontend)
├── .env.example              # Безпечний приклад конфігурації оточення (без секретів)
└── README.md
```

---

## 🔐 Автентифікація: Вхід через Google (Amazon Cognito Federation) та Email/Пароль

Платформа підтримує два способи входу, що працюють паралельно:
1. **Локальний вхід за Email та паролем** (збережено для швидкої локальної розробки та демонстраційних акаунтів).
2. **Вхід через Google як федеративний провайдер Amazon Cognito** (`Google → Amazon Cognito Hosted UI → UCU SideQuest`).

### Як працює потік входу `Google → Cognito → SideQuest` (OAuth 2.0 Authorization Code + PKCE)

1. **Ініціація на фронтенді**: Користувач натискає кнопку **«Продовжити з Google (Continue with Google)»** на сторінці `/login` або `/register`.
2. **Генерація PKCE та редірект**: Фронтенд (`frontend/lib/cognito.ts`) генерує криптографічний `code_verifier`, обчислює SHA-256 `code_challenge` (`S256`) та випадковий параметр `state` (захист від CSRF), зберігає їх у `sessionStorage` і перенаправляє браузер на **Amazon Cognito Hosted UI**:
   ```
   https://<cognito-domain>/oauth2/authorize?client_id=<app_client_id>&response_type=code&scope=openid+email+profile&redirect_uri=<callback_url>&identity_provider=Google&state=<state>&code_challenge_method=S256&code_challenge=<challenge>
   ```
3. **Федерація через Google**: Amazon Cognito перенаправляє користувача до Google OAuth 2.0, отримує підтвердження особи та повертає користувача на сконфігурований у SideQuest маршрут `/auth/callback?code=...&state=...`.
4. **Обмін коду на токени**: Сторінка `frontend/app/auth/callback/page.tsx` перевіряє `state` і обмінює одноразовий `code` + `code_verifier` на токени через ендпоінт Cognito `POST https://<cognito-domain>/oauth2/token`.
5. **Синхронізація профілю та перевірка на бекенді**:
   - Фронтенд зберігає виданий Cognito `access_token` і викликає захищений ендпоінт `POST /api/v1/auth/cognito/sync` (або `GET /api/v1/me`) із заголовком `Authorization: Bearer <cognito_access_token>`.
   - Бекенд FastAPI (`backend/app/utils/security.py`) самостійно завантажує публічні ключі підпису **Cognito JWKS** (`https://cognito-idp.<region>.amazonaws.com/<user_pool_id>/.well-known/jwks.json`), перевіряє цифровий підпис `RS256`, термін дії (`exp`), видавця (`iss`), `client_id` та призначення токена (`token_use == "access"`).
   - Бекенд використовує стабільний клейм `sub` із токена Cognito як зовнішній ідентифікатор (`users.cognito_sub`). Під час першого входу `AuthService.sync_cognito_user` отримує верифіковані дані (`email`, `name`, `picture`) з ендпоінту Cognito `/oauth2/userInfo` та створює профіль у таблиці `users` із роллю `student`.
   - Бекенд **ніколи не довіряє** `user_id`, `email` або `role`, переданим напряму від фронтенду.

---

## ☁️ Налаштування Google Cloud та Amazon Cognito

Інфраструктура для Amazon Cognito описана у шаблоні CloudFormation: [`infrastructure/cognito-google-auth.yaml`](./infrastructure/cognito-google-auth.yaml).

### Крок 1: Створення OAuth 2.0 клієнта в Google Cloud Console

1. Перейдіть у [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials).
2. Налаштуйте **OAuth consent screen** (User Type: *Internal* для домену `@ucu.edu.ua` або *External*, запитувані scopes: `openid`, `email`, `profile`).
3. Натисніть **Create Credentials → OAuth client ID** та оберіть тип **Web application**.
4. У полі **Authorized JavaScript origins** додайте домен вашого Cognito Hosted UI:
   - `https://<ваш-cognito-domain-prefix>-<env>.auth.<region>.amazoncognito.com`
5. У полі **Authorized redirect URIs** додайте точний callback URI провайдера Cognito (доступний також у вихідному параметрі CloudFormation `CognitoGoogleAuthorizedRedirectUri`):
   - `https://<ваш-cognito-domain-prefix>-<env>.auth.<region>.amazoncognito.com/oauth2/idpresponse`
6. Збережіть отримані **Google Client ID** та **Google Client Secret** у безпечному сховищі (AWS Secrets Manager / SSM Parameter Store). **Ніколи не комітьте їх у репозиторій та не передавайте у змінні `NEXT_PUBLIC_*`.**

### Крок 2: Розгортання Amazon Cognito (CloudFormation)

Розгорніть стек за допомогою AWS CLI, передавши секрети Google через параметри:

```bash
aws cloudformation deploy \
  --template-file infrastructure/cognito-google-auth.yaml \
  --stack-name ucu-sidequest-cognito-dev \
  --region eu-central-1 \
  --parameter-overrides \
    EnvironmentName=dev \
    CognitoDomainPrefix=ucu-sidequest-auth \
    GoogleClientId="ВАШ_GOOGLE_CLIENT_ID" \
    GoogleClientSecret="ВАШ_GOOGLE_CLIENT_SECRET" \
    LocalCallbackUrl="http://localhost:3000/auth/callback" \
    ProductionCallbackUrl="https://sidequest.ucu.edu.ua/auth/callback" \
    LocalLogoutUrl="http://localhost:3000/login" \
    ProductionLogoutUrl="https://sidequest.ucu.edu.ua/login"
```

Після розгортання перегляньте вихідні значення стеку:

```bash
aws cloudformation describe-stacks \
  --stack-name ucu-sidequest-cognito-dev \
  --query "Stacks[0].Outputs"
```

Ви отримаєте готові значення:
- `CognitoUserPoolId` → для `COGNITO_USER_POOL_ID` та `NEXT_PUBLIC_COGNITO_USER_POOL_ID`
- `CognitoAppClientId` → для `COGNITO_CLIENT_ID` та `NEXT_PUBLIC_COGNITO_CLIENT_ID`
- `CognitoHostedUiDomain` → для `COGNITO_DOMAIN` та `NEXT_PUBLIC_COGNITO_DOMAIN`
- `CognitoGoogleAuthorizedRedirectUri` → точний Redirect URI для Google Cloud Console (`/oauth2/idpresponse`).

---

## ⚙️ Змінні середовища (Публічні vs Секретні)

Повний шаблон наведено у файлі [`.env.example`](./.env.example).

| Змінна | Рівень доступу | Де використовується | Призначення |
|---|---|---|---|
| `DATABASE_URL` | 🔒 **Секретна (Backend)** | FastAPI / Alembic | Рядок підключення до PostgreSQL або SQLite |
| `SECRET_KEY` | 🔒 **Секретна (Backend)** | FastAPI | Ключ підпису локальних HS256 JWT токенів (>= 32 символи) |
| `GoogleClientSecret` | 🔒 **Секретна (AWS Infra)** | Cognito CloudFormation | Секрет Google OAuth клієнта (зберігається тільки в Cognito / Secrets Manager, **ніколи** у фронтенді) |
| `AWS_REGION` | Позабраузерна (Backend) | FastAPI | Регіон пулу Cognito (напр., `eu-central-1`) |
| `COGNITO_USER_POOL_ID` | Публічна конфігурація | FastAPI | ID пулу користувачів Cognito для перевірки `iss` та JWKS |
| `COGNITO_CLIENT_ID` | Публічна конфігурація | FastAPI | ID публічного Web App Client у Cognito для перевірки `client_id` |
| `COGNITO_DOMAIN` | Публічна конфігурація | FastAPI | Домен Cognito Hosted UI для запитів до `/oauth2/userInfo` |
| `GOOGLE_SIGNIN_ENABLED` | Публічна конфігурація | FastAPI | Прапорець активації Google Sign-In на бекенді (`true`/`false`) |
| `NEXT_PUBLIC_API_URL` | 🌐 **Публічна (Browser)** | Next.js | URL бекенд API (`http://localhost:8000/api/v1`) |
| `NEXT_PUBLIC_GOOGLE_SIGNIN_ENABLED` | 🌐 **Публічна (Browser)** | Next.js | Вмикає кнопку «Продовжити з Google» за наявності конфігурації Cognito |
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | 🌐 **Публічна (Browser)** | Next.js | ID пулу користувачів Cognito |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID` | 🌐 **Публічна (Browser)** | Next.js | ID публічного App Client (без client secret) |
| `NEXT_PUBLIC_COGNITO_DOMAIN` | 🌐 **Публічна (Browser)** | Next.js | Повний домен Cognito Hosted UI (`https://...amazoncognito.com`) |
| `NEXT_PUBLIC_COGNITO_REDIRECT_URI` | 🌐 **Публічна (Browser)** | Next.js | Callback URL додатку (`http://localhost:3000/auth/callback` або прод URL) |
| `NEXT_PUBLIC_COGNITO_LOGOUT_URI` | 🌐 **Публічна (Browser)** | Next.js | Sign-out URL (`http://localhost:3000/login` або прод URL) |
| `NEXT_PUBLIC_COGNITO_SCOPES` | 🌐 **Публічна (Browser)** | Next.js | Стандартні OAuth scopes: `openid email profile` |

### Налаштування Callback та Sign-Out URL для локального та промислового середовищ

У налаштуваннях App Client в Amazon Cognito (`CallbackURLs` та `LogoutURLs`) повинні бути явно зареєстровані:
- **Локальна розробка**:
  - Callback URL: `http://localhost:3000/auth/callback`
  - Sign-out URL: `http://localhost:3000/login`
- **Production**:
  - Callback URL: `https://<ваш-домен-sidequest>/auth/callback`
  - Sign-out URL: `https://<ваш-домен-sidequest>/login`

---

## 🚀 Швидкий запуск та локальне тестування без Google-ключів

Локальна розробка повністю працює **без реальних облікових даних Google та AWS Cognito**. Якщо змінні `NEXT_PUBLIC_COGNITO_*` не задані або `NEXT_PUBLIC_GOOGLE_SIGNIN_ENABLED=false`, кнопка «Продовжити з Google» автоматично відображається у вимкненому стані з чітким поясненням: *«Вхід через Google ще не налаштовано (Google sign-in is not configured yet)»*, не імітуючи фіктивного успішного входу. Усі функції платформи доступні через локальний вхід за email та паролем.

### Варіант 1: Через Docker Compose (PostgreSQL + Backend + Frontend)

```bash
docker compose up --build
```

- **Веб-інтерфейс**: [http://localhost:3000](http://localhost:3000)
- **API Документація (Swagger UI)**: [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)

### Варіант 2: Локальний запуск для розробки (без Docker)

#### 1. Бекенд

```bash
cd sidequest/backend

# Активація віртуального середовища
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Для SQLite:
$env:DATABASE_URL="sqlite+aiosqlite:///./sidequest.db"   # PowerShell
# export DATABASE_URL="sqlite+aiosqlite:///./sidequest.db" # Linux/macOS

# Запуск міграцій та наповнення демо-даними:
alembic upgrade head
python seed.py

# Запуск сервера API
uvicorn app.main:app --reload --port 8000
```

#### 2. Фронтенд

```bash
cd sidequest/frontend
npm install
npm run dev
```

---

## 👤 Демонстраційні облікові записи

На сторінці `/login` доступні **кнопки швидкого входу в 1 клік**, а також наступні тестові облікові записи:

| Роль | Email | Пароль | Можливості |
|---|---|---|---|
| 🎓 **Студент** | `student@ucu.edu.ua` | `StudentPass123!` | Створення SideQuests, приєднання/вихід, перегляд учасників, перегляд подій |
| 🏛️ **Організатор** | `organizer@ucu.edu.ua` | `OrganizerPass123!` | Створення та редагування подій УКУ, додавання спікерів, посилань та матеріалів підготовки |
| 🛡️ **Адміністратор** | `admin@ucu.edu.ua` | `AdminPass123!` | Повні права модерації, керування ролями, скасування активностей |

---

## 🧪 Тестування та перевірка

Запуск повного набору інтеграційних тестів бекенду (включно з тестами валідації токенів Cognito RS256, синхронізації профілю та перевірки конфліктів об'єднання акаунтів):

```bash
cd sidequest/backend
.\venv\Scripts\pytest.exe -v
```

Перевірка продакшн-збірки та типів фронтенду:

```bash
cd sidequest/frontend
npm run build
```

---

## ⚠️ Відомі обмеження та поведінка існуючих акаунтів (Account Linking)

1. **Відсутність автоматичного об'єднання акаунтів за email (Account Linking)**:
   - З міркувань безпеки SideQuest **не об'єднує автоматично** облікові записи лише на основі збігу адреси електронної пошти.
   - Якщо користувач раніше зареєструвався локально за допомогою email та пароля (`auth_provider = "local"`), а потім намагається увійти через Google з тією самою електронною адресою, бекенд поверне статус `409 Conflict` із чітким повідомленням українською мовою про те, що акаунт із цим email вже існує з паролем, і запропонує увійти стандартним способом.
   - Так само, якщо акаунт було створено через Google (`auth_provider = "google"`), спроба входу через форму пароля підкаже скористатися кнопкою «Продовжити з Google».
2. **Необхідність реальних облікових даних AWS та Google для живого OAuth редіректу**:
   - У репозиторії не зберігаються реальні ключі Google OAuth чи прив'язані до продакшн AWS-акаунту значення `COGNITO_USER_POOL_ID`. Поки власник проєкту не розгорне стек `infrastructure/cognito-google-auth.yaml` і не заповнить публічні змінні `COGNITO_*` / `NEXT_PUBLIC_COGNITO_*`, кнопка входу через Google залишається неактивною з пояснювальним повідомленням.
3. **Часовий пояс**: усі дати зберігаються в UTC та форматуються для відображення у часовому поясі `Europe/Kyiv`.
