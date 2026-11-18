# ⚡ UCU SideQuest

Веб-платформа для спільноти Українського Католицького Університету (УКУ) для пошуку компанії на студентські **SideQuests** та перегляду **Подій УКУ** з підтримкою входу за email/паролем та через **Google (Amazon Cognito Hosted UI OAuth 2.0 + PKCE)**.

Увесь вихідний код, інфраструктурні шаблони та документація розташовані в директорії [`sidequest/`](./sidequest/).

## Швидкий старт

```bash
cd sidequest

# Варіант 1: Запуск через Docker Compose
docker compose up --build

# Варіант 2: Локальний запуск без Docker (SQLite + Next.js)
# Див. детальну інструкцію у sidequest/README.md
```

Докладна документація щодо:
- Архітектури потоку **Google → Amazon Cognito → UCU SideQuest** (OAuth 2.0 Authorization Code + PKCE),
- Налаштування Google Cloud Console та шаблону CloudFormation [`sidequest/infrastructure/cognito-google-auth.yaml`](./sidequest/infrastructure/cognito-google-auth.yaml),
- Публічних і секретних змінних середовища ([`sidequest/.env.example`](./sidequest/.env.example)),
- Демонстраційних акаунтів, запуску тестів та відомих обмежень (зокрема поведінки Account Linking)

міститься у головному файлі документації: **[`sidequest/README.md`](./sidequest/README.md)**.
